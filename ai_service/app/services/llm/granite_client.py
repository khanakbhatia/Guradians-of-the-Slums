"""RAG-grounded local IBM Granite generation client."""

from __future__ import annotations

import re

from app.integrations.local_granite import (
    GraniteRuntimeError,
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


class GraniteGroundingError(RuntimeError):
    """Raised when a grounded response cannot be generated safely."""


class GraniteClient:
    """Local IBM Granite client that refuses ungrounded generation."""

    def __init__(self, rag_service: RagRetrievalService | None = None) -> None:
        self.rag_service = rag_service or RagRetrievalService()
        self.granite_client = LocalGraniteClient()

    def generate(self, request: GraniteGenerationRequest) -> GraniteGenerationResponse:
        """Generate only after retrieving grounding contexts."""

        self._validate_request(request)
        retrieval = self.rag_service.retrieve(
            RagRetrievalRequest(
                query=self._retrieval_query(request),
                index_name=request.index_name,
                top_k=request.top_k,
                source_types=request.source_types,
            )
        )
        if not retrieval.contexts:
            msg = "Granite generation blocked: no RAG grounding contexts were retrieved."
            raise GraniteGroundingError(msg)

        prompt = self._grounded_prompt(request, retrieval.contexts)
        granite_response = self._call_granite(request, prompt)
        generated_text = granite_response.text
        self._validate_grounded_output(generated_text, retrieval.contexts)
        citations = self._citations(retrieval.contexts)

        return GraniteGenerationResponse(
            output_type=request.output_type,
            generated_text=generated_text,
            grounded=True,
            model_id=granite_response.model_id,
            citations=citations,
            retrieved_contexts=retrieval.contexts,
        )

    @staticmethod
    def _validate_request(request: GraniteGenerationRequest) -> None:
        if request.output_type == GraniteOutputType.MULTILINGUAL_ALERT and not request.target_languages:
            msg = "Multilingual alerts require at least one target language."
            raise GraniteGroundingError(msg)

    def _call_granite(self, request: GraniteGenerationRequest, prompt: str):
        try:
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
        except GraniteRuntimeError as exc:
            raise GraniteGroundingError(str(exc)) from exc

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
