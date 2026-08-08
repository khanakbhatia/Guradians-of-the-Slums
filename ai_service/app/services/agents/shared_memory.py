"""Shared Granite incident memory for agent communication."""

from __future__ import annotations

from uuid import uuid4

from app.schemas.agents import BeeAISharedMemoryEntry


class BeeAIIncidentMemory:
    """Expose a JSON-safe shared memory log for the Granite workflow."""

    def __init__(self) -> None:
        self.entries: list[BeeAISharedMemoryEntry] = []

    async def add_user_context(
        self,
        author: str,
        content: str,
        related_step_id: str | None = None,
        attempt: int = 0,
    ) -> None:
        """Add user/coordinator context to shared memory."""

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
        """Add agent output to shared memory."""

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
