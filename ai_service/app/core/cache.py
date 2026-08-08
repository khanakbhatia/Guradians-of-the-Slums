"""Lightweight TTL cache for deterministic AI service reuse."""

from __future__ import annotations

import hashlib
import json
import threading
import time
from collections.abc import Callable
from dataclasses import dataclass
from typing import TypeVar

from pydantic import BaseModel


T = TypeVar("T")


@dataclass
class CacheEntry:
    """Single in-memory cache entry."""

    value: object
    expires_at: float


class TTLCache:
    """Simple process-local TTL cache.

    This is intentionally small and dependency-free for hackathon deployment.
    Swap with Redis later without changing service contracts.
    """

    def __init__(self, default_ttl_seconds: int = 300, max_entries: int = 512) -> None:
        self.default_ttl_seconds = default_ttl_seconds
        self.max_entries = max_entries
        self._entries: dict[str, CacheEntry] = {}
        self._lock = threading.RLock()

    def get_or_set(self, key: str, factory: Callable[[], T], ttl_seconds: int | None = None) -> T:
        """Return cached value or compute and cache it."""

        with self._lock:
            cached = self.get(key)
            if cached is not None:
                return cached  # type: ignore[return-value]

            value = factory()
            self.set(key, value, ttl_seconds=ttl_seconds)
            return value

    def get(self, key: str) -> object | None:
        """Return a cached value if present and fresh."""

        with self._lock:
            now = time.time()
            entry = self._entries.get(key)
            if entry and entry.expires_at > now:
                return entry.value
            if entry:
                self._entries.pop(key, None)
            return None

    def set(self, key: str, value: object, ttl_seconds: int | None = None) -> None:
        """Store a cache value."""

        with self._lock:
            self._evict_if_needed()
            self._entries[key] = CacheEntry(
                value=value,
                expires_at=time.time() + (ttl_seconds or self.default_ttl_seconds),
            )

    def clear_expired(self) -> None:
        """Remove expired entries."""

        with self._lock:
            now = time.time()
            expired_keys = [key for key, entry in self._entries.items() if entry.expires_at <= now]
            for key in expired_keys:
                self._entries.pop(key, None)

    def _evict_if_needed(self) -> None:
        self.clear_expired()
        while len(self._entries) >= self.max_entries:
            oldest_key = min(self._entries, key=lambda key: self._entries[key].expires_at)
            self._entries.pop(oldest_key, None)


def stable_cache_key(namespace: str, payload: BaseModel | dict | str) -> str:
    """Create a stable hash key for request-like payloads."""

    if isinstance(payload, BaseModel):
        raw = payload.model_dump(mode="json")
    elif isinstance(payload, dict):
        raw = payload
    else:
        raw = payload

    encoded = json.dumps(raw, sort_keys=True, separators=(",", ":"), default=str)
    digest = hashlib.sha256(encoded.encode("utf-8")).hexdigest()
    return f"{namespace}:{digest}"


graph_cache = TTLCache(default_ttl_seconds=300, max_entries=256)
risk_cache = TTLCache(default_ttl_seconds=300, max_entries=256)
rag_cache = TTLCache(default_ttl_seconds=600, max_entries=256)
granite_cache = TTLCache(default_ttl_seconds=900, max_entries=128)
beeai_cache = TTLCache(default_ttl_seconds=300, max_entries=64)
