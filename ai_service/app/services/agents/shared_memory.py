"""Shared BeeAI incident memory for agent communication."""

from __future__ import annotations

from uuid import uuid4

from beeai_framework.backend import AssistantMessage, UserMessage
from beeai_framework.memory import UnconstrainedMemory

from app.schemas.agents import BeeAISharedMemoryEntry


class BeeAIIncidentMemory:
    """Wrap BeeAI memory and expose a JSON-safe memory log."""

    def __init__(self) -> None:
        self._memory = UnconstrainedMemory()
        self.entries: list[BeeAISharedMemoryEntry] = []

    @property
    def beeai_memory(self) -> UnconstrainedMemory:
        """Return the native BeeAI memory object."""

        return self._memory

    async def add_user_context(
        self,
        author: str,
        content: str,
        related_step_id: str | None = None,
        attempt: int = 0,
    ) -> None:
        """Add user/coordinator context to BeeAI memory."""

        await self._memory.add(UserMessage(content=content))
        self.entries.append(
            BeeAISharedMemoryEntry(
                memory_id=str(uuid4()),
                author=author,
                entry_type="context",
                content=content,
                related_step_id=related_step_id,
                attempt=attempt,
            )
        )

    async def add_agent_output(
        self,
        author: str,
        content: str,
        related_step_id: str,
        attempt: int,
    ) -> None:
        """Add agent output to BeeAI memory."""

        await self._memory.add(AssistantMessage(content=content))
        self.entries.append(
            BeeAISharedMemoryEntry(
                memory_id=str(uuid4()),
                author=author,
                entry_type="agent_output",
                content=content,
                related_step_id=related_step_id,
                attempt=attempt,
            )
        )

    def snapshot_text(self) -> str:
        """Return compact memory text for AgentWorkflow input context."""

        if not self.entries:
            return "Shared memory is empty."
        return "\n".join(
            f"- [{entry.entry_type}] {entry.author}: {entry.content}"
            for entry in self.entries[-12:]
        )
