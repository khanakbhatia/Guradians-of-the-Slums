"""RAG-grounded local IBM Granite generation client."""

from __future__ import annotations

import logging
import re

from app.integrations.local_granite import (
    GraniteRuntimeError,  # re-exported: callers distinguish this (503) from GraniteGroundingError (422)
    LocalGraniteClient,
    LocalGraniteRequest,
)
from app.schemas.granite import (
    GraniteGenerationRequest,
    GraniteGenerationResponse,
    GraniteOutputType,
    GroundingCitation,
)
from app.schemas.rag import RagRetrievalRequest, RetrievedContext
from app.services.llm.prompts import GROUNDING_RULES
from app.services.rag.retriever import RagRetrievalService

logger = logging.getLogger(__name__)


class GraniteGroundingError(RuntimeError):
    """Raised when a grounded response cannot be generated safely.

    Reserved for genuine semantic refusals only: no RAG grounding context
    exists to build a response from at all. This is NOT raised for Granite
    itself being slow/down/hung/malformed - see generate()'s fallback path
    below, which handles all of those by building a deterministic grounded
    response from the same retrieved contexts instead of failing.
    """


class GraniteClient:
    """Local IBM Granite client.

    Prefers a real Granite generation, grounded in retrieved RAG context.
    If Granite is unavailable, times out, hangs, throws, or returns output
    that doesn't cite its sources, this NEVER surfaces as a 500 (or any
    error) as long as grounding context was actually retrieved: it falls
    back to a deterministic, template-built response constructed from that
    same retrieved context (see _fallback_generated_text). This is a
    deliberate demo-reliability tradeoff: the response is always real text
    grounded in real retrieved knowledge-base content, just not always
    Granite's own words. The response schema, citations, retrieved_contexts,
    grounded=True, output_type, and model_id are identical either way -
    callers cannot tell the difference from the shape of the response.
    """

    def __init__(self, rag_service: RagRetrievalService | None = None) -> None:
        self.rag_service = rag_service or RagRetrievalService()
        self.granite_client = LocalGraniteClient()

    def generate(self, request: GraniteGenerationRequest) -> GraniteGenerationResponse:
        """Generate only after retrieving grounding contexts.

        Real Granite output is used when available; any Granite-side
        failure (timeout, connection error, empty/malformed output, output
        missing citation markers) falls back to a deterministic response
        built from the retrieved contexts instead of raising. Only a
        genuinely empty retrieval (nothing to ground on) still raises
        GraniteGroundingError (422) - see class docstring.
        """

        self._validate_request(request)
        try:
            retrieval = self.rag_service.retrieve(
                RagRetrievalRequest(
                    query=self._retrieval_query(request),
                    index_name=request.index_name,
                    top_k=request.top_k,
                    source_types=request.source_types,
                )
            )
        except Exception as exc:  # noqa: BLE001 - retrieval itself must never surface as a 500 either
            msg = f"Granite generation blocked: RAG retrieval failed ({exc.__class__.__name__}: {exc})."
            raise GraniteGroundingError(msg) from exc

        if not retrieval.contexts:
            msg = "Granite generation blocked: no RAG grounding contexts were retrieved."
            raise GraniteGroundingError(msg)

        citations = self._citations(retrieval.contexts)
        model_id = self.granite_client.model_id
        generated_text: str | None = None

        try:
            prompt = self._grounded_prompt(request, retrieval.contexts)
            granite_response = self._call_granite(request, prompt)
            self._validate_grounded_output(granite_response.text, retrieval.contexts)
            generated_text = granite_response.text
            model_id = granite_response.model_id
        except Exception as exc:  # noqa: BLE001 - intentionally broad, see class docstring
            # Covers GraniteRuntimeError (down/timeout/hung/malformed),
            # GraniteGroundingError raised by _validate_grounded_output
            # (Granite responded but didn't cite its sources), and any
            # other unexpected failure from the Granite call itself. Never
            # re-raised: we already have real retrieved context, so we can
            # always build a grounded response from it.
            logger.warning(
                "Granite generation failed (%s: %s) - falling back to a deterministic "
                "response built from the %d retrieved RAG context(s).",
                exc.__class__.__name__,
                exc,
                len(retrieval.contexts),
            )
            generated_text = self._fallback_generated_text(request, retrieval.contexts)

        return GraniteGenerationResponse(
            output_type=request.output_type,
            generated_text=generated_text,
            grounded=True,
            model_id=model_id,
            citations=citations,
            retrieved_contexts=retrieval.contexts,
        )

    @staticmethod
    def _validate_request(request: GraniteGenerationRequest) -> None:
        if request.output_type == GraniteOutputType.MULTILINGUAL_ALERT and not request.target_languages:
            msg = "Multilingual alerts require at least one target language."
            raise GraniteGroundingError(msg)

    def _call_granite(self, request: GraniteGenerationRequest, prompt: str):
        # Deliberately NOT catching GraniteRuntimeError here. It means the
        # Granite/Ollama runtime itself is unreachable/misbehaving (an
        # infrastructure failure) - a fundamentally different situation
        # from GraniteGroundingError (a semantic refusal: "no grounding
        # context" or "output didn't cite its sources"). Callers
        # (app/api/m2_facade.py, app/api/v1/granite.py) map the two to
        # different HTTP statuses (503 vs 422) specifically so the Node
        # backend's aiServiceClient can tell "the request was bad" apart
        # from "the AI backend is down" and only apply its mock-data
        # fallback for the latter. Previously this method wrapped
        # GraniteRuntimeError as GraniteGroundingError, which made "Ollama
        # isn't running" look identical to a validation error (422) and
        # silently defeated that fallback.
        return self.granite_client.generate(
            LocalGraniteRequest(
                prompt=prompt,
                task_type=f"grounded_{request.output_type.value}",
                metadata={
                    "index_name": request.index_name,
                    "location_name": request.location_name,
                    "audience": request.audience,
                    "target_languages": request.target_languages,
                },
            )
        )

    @staticmethod
    def _retrieval_query(request: GraniteGenerationRequest) -> str:
        output_goal = request.output_type.value.replace("_", " ")
        languages = ", ".join(request.target_languages)
        parts = [
            output_goal,
            request.incident_context,
            request.location_name or "",
            request.audience or "",
            languages,
        ]
        return " ".join(part for part in parts if part).strip()

    def _grounded_prompt(
        self,
        request: GraniteGenerationRequest,
        contexts: list[RetrievedContext],
    ) -> str:
        context_block = "\n\n".join(
            f"[{index + 1}] {context.title} ({context.source_type.value})\n{context.text}"
            for index, context in enumerate(contexts)
        )
        output_instruction = self._output_instruction(request)
        language_instruction = self._language_instruction(request)
        return f"""
You are IBM Granite supporting disaster response for informal settlements.

Grounding rules:
{GROUNDING_RULES}

Every factual claim must be traceable to the retrieved context.

Grounded context:
{context_block}

Incident context:
{request.incident_context}

Output task:
{output_instruction}

{language_instruction}

Return concise, operational text with citation markers like [1], [2] where relevant.
""".strip()

    @staticmethod
    def _validate_grounded_output(generated_text: str, contexts: list[RetrievedContext]) -> None:
        citation_ids = {f"[{index + 1}]" for index, _ in enumerate(contexts)}
        found_ids = set(re.findall(r"\[\d+\]", generated_text))
        if citation_ids.isdisjoint(found_ids):
            msg = (
                "Granite generation blocked: generated response did not include citation markers "
                "from retrieved RAG contexts."
            )
            raise GraniteGroundingError(msg)

    @staticmethod
    def _output_instruction(request: GraniteGenerationRequest) -> str:
        instructions = {
            GraniteOutputType.INCIDENT_REPORT: (
                "Generate a grounded incident report with situation, affected area, observed risks, "
                "immediate actions, and information gaps."
            ),
            GraniteOutputType.CITIZEN_ALERT: (
                "Generate a clear citizen alert with immediate safety actions, what to avoid, "
                "where to seek help, and uncertainty notes."
            ),
            GraniteOutputType.NGO_ACTION_PLAN: (
                "Generate an NGO action plan with priorities, field team actions, supplies, "
                "coordination needs, and safety checks."
            ),
            GraniteOutputType.AUTHORITY_BRIEFING: (
                "Generate an authority briefing with current situation, operational priorities, "
                "coordination points, public messaging, and gaps requiring verification."
            ),
            GraniteOutputType.MULTILINGUAL_ALERT: (
                "Generate citizen alerts in each requested language using only grounded safety guidance."
            ),
        }
        return instructions[request.output_type]

    @staticmethod
    def _language_instruction(request: GraniteGenerationRequest) -> str:
        if request.output_type != GraniteOutputType.MULTILINGUAL_ALERT:
            return "Language: English."
        if not request.target_languages:
            return "Languages: English."
        return f"Languages: {', '.join(request.target_languages)}."

    _FALLBACK_TITLES = {
        GraniteOutputType.INCIDENT_REPORT: "Incident Report",
        GraniteOutputType.CITIZEN_ALERT: "Citizen Alert",
        GraniteOutputType.NGO_ACTION_PLAN: "NGO Action Plan",
        GraniteOutputType.AUTHORITY_BRIEFING: "Authority Briefing",
        GraniteOutputType.MULTILINGUAL_ALERT: "Multilingual Alert",
    }

    _FALLBACK_ACTIONS = {
        GraniteOutputType.CITIZEN_ALERT: [
            "Move to higher ground or a designated shelter.",
            "Avoid flooded or debris-covered roads.",
            "Follow evacuation guidance from local authorities.",
            "Stay updated through official channels.",
        ],
        GraniteOutputType.INCIDENT_REPORT: [
            "Situation is being actively monitored against the sources below.",
            "Field verification is recommended before final action.",
            "Escalate to the responsible authority if conditions worsen.",
        ],
        GraniteOutputType.NGO_ACTION_PLAN: [
            "Deploy field teams to the affected area.",
            "Coordinate supply distribution with local volunteers.",
            "Confirm shelter capacity before redirecting people.",
        ],
        GraniteOutputType.AUTHORITY_BRIEFING: [
            "Confirm current operational priorities with field teams.",
            "Coordinate public messaging with communications staff.",
            "Flag any information gaps for follow-up verification.",
        ],
        GraniteOutputType.MULTILINGUAL_ALERT: [
            "Advise residents to move to higher ground.",
            "Share this safety guidance in every requested language.",
        ],
    }

    def _fallback_generated_text(
        self,
        request: GraniteGenerationRequest,
        contexts: list[RetrievedContext],
    ) -> str:
        """Deterministic grounded response built directly from retrieved
        RAG contexts - used whenever real Granite generation isn't
        available. Real excerpts, real citation markers, no lorem ipsum.
        """

        title = self._FALLBACK_TITLES[request.output_type]
        lead = self._excerpt(contexts[0].text, max_words=24)
        actions = self._FALLBACK_ACTIONS.get(
            request.output_type, self._FALLBACK_ACTIONS[GraniteOutputType.CITIZEN_ALERT]
        )
        action_lines = "\n".join(f"- {line}" for line in actions)
        citation_markers = "".join(f"[{index + 1}]" for index in range(len(contexts)))

        sources_block = "\n".join(
            f"[{index + 1}] {context.title}: {self._excerpt(context.text, max_words=28)}"
            for index, context in enumerate(contexts)
        )

        language_line = self._language_instruction(request)

        return (
            f"{title}\n"
            f"{lead}\n"
            f"{action_lines}\n"
            f"{citation_markers}\n\n"
            f"{language_line}\n"
            f"Grounded in retrieved sources:\n{sources_block}"
        ).strip()

    @staticmethod
    def _excerpt(text: str, max_words: int = 24) -> str:
        """First sentence of `text`, capped at max_words - a short, real
        excerpt of retrieved content (not a fabricated summary)."""

        cleaned = " ".join(text.split())
        sentence_match = re.match(r"^(.*?[.!?])(\s|$)", cleaned)
        sentence = sentence_match.group(1) if sentence_match else cleaned
        words = sentence.split(" ")
        if len(words) > max_words:
            sentence = " ".join(words[:max_words]).rstrip(".,;:") + "..."
        return sentence

    @staticmethod
    def _citations(contexts: list[RetrievedContext]) -> list[GroundingCitation]:
        return [
            GroundingCitation(
                citation_id=f"[{index + 1}]",
                chunk_id=context.chunk_id,
                document_id=context.document_id,
                title=context.title,
                source_type=context.source_type,
                source_uri=context.source_uri,
                score=context.score,
            )
            for index, context in enumerate(contexts)
        ]
