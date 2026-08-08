# IBM Granite Grounded Generation

Granite generation is allowed only after RAG retrieval.

## Supported Outputs

- Incident reports
- Citizen alerts
- NGO action plans
- Authority briefings
- Multilingual alerts

## Endpoint

```text
POST /api/v1/granite/generate
```

## Grounding Rules

- Retrieve knowledge contexts before every Granite call.
- Block generation if no contexts are retrieved.
- Use only retrieved context in the prompt.
- Never answer from general model knowledge.
- Include citation markers in generated text.
- Return citations and retrieved contexts in structured JSON.

## Failure Behavior

The service returns `422` when:

- no RAG grounding contexts are found
- watsonx credentials are not configured
- Granite generation cannot be safely grounded
