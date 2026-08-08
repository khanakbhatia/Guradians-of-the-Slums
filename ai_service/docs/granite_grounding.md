# IBM Granite Grounded Generation

IBM Granite report and alert generation is allowed only after RAG retrieval.

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

The `/granite` path is retained for existing M2/M1 contracts. The runtime behind it is local IBM Granite.

## Grounding Rules

- Retrieve knowledge contexts before every IBM Granite generation call.
- Block generation if no contexts are retrieved.
- Use only retrieved context in the prompt.
- Never answer from general model knowledge.
- Include citation markers in generated text.
- Return citations and retrieved contexts in structured JSON.

## Failure Behavior

The service returns `422` when:

- no RAG grounding contexts are found
- local Granite is not reachable at `GRANITE_BASE_URL`
- Granite generation cannot be safely grounded
