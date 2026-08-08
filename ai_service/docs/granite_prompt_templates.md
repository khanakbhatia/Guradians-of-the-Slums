# IBM Granite Prompt Templates

Reusable templates live in:

`app/services/llm/prompts.py`

Templates included:

- `authority`
- `volunteer`
- `citizen`
- `ngo`
- `admin`

## Design Rules

- RAG-grounded only
- No direct answering
- Few-shot examples included
- Explicit information gaps
- Citation markers required
- Safe public communication
- JSON-compatible text output

## Required Render Fields

- `retrieved_context`
- `incident_context`
- `grounding_rules`

The templates are reusable prompt assets for RAG-grounded IBM Granite calls.
