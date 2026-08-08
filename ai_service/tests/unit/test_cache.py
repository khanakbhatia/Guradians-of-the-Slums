from app.core.cache import TTLCache, stable_cache_key


def test_ttl_cache_reuses_computed_value() -> None:
    cache = TTLCache(default_ttl_seconds=60)
    calls = {"count": 0}

    def factory() -> str:
        calls["count"] += 1
        return "value"

    assert cache.get_or_set("key", factory) == "value"
    assert cache.get_or_set("key", factory) == "value"
    assert calls["count"] == 1


def test_stable_cache_key_is_order_independent_for_dicts() -> None:
    first = stable_cache_key("risk", {"a": 1, "b": 2})
    second = stable_cache_key("risk", {"b": 2, "a": 1})

    assert first == second
