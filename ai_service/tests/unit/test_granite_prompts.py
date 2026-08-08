from app.services.llm.prompts import PROMPT_TEMPLATES, render_prompt


def test_granite_prompt_templates_are_grounded_and_reusable() -> None:
    assert {"authority", "volunteer", "citizen", "ngo", "admin"} <= set(PROMPT_TEMPLATES)

    rendered = render_prompt(
        "citizen",
        retrieved_context="[1] Move to official shelters.",
        incident_context="Flooding reported near Zone A.",
    )

    assert "Use only the retrieved context" in rendered
    assert "Flooding reported near Zone A." in rendered
    assert "[1] Move to official shelters." in rendered
