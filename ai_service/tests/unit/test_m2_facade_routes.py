from app.api.m2_facade import router


def test_m2_facade_exposes_required_paths() -> None:
    paths = {route.path for route in router.routes}

    assert "/detect" in paths
    assert "/analyze" in paths
    assert "/risk-score" in paths
    assert "/explain" in paths
    assert "/assign" in paths
    assert "/evacuate" in paths
    assert "/report" in paths
    assert "/chat" in paths
