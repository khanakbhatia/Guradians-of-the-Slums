# Granite-Backed Multi-Agent System

This service does not use BeeAI runtime code and does not treat IBM Bob as an inference API.

The filename is retained for compatibility with earlier project references. The active implementation is a lightweight FastAPI service workflow coordinated through local IBM Granite.

## Runtime Boundary

Generated agent outputs use `app.integrations.local_granite.LocalGraniteClient`.

The local Granite adapter targets an Ollama-compatible runtime:

- `GRANITE_BASE_URL`
- `GRANITE_MODEL`
- `GRANITE_TIMEOUT_SECONDS`

If the local Granite server is unavailable, the service returns structured failure information instead of fabricated AI output.

## Agents

| Agent | Role | Goal | Memory | Tools | Output |
| --- | --- | --- | --- | --- | --- |
| Risk Analyst | Analyzes flood, fire, infrastructure, and evacuation risk signals. | Identify urgent risks, confidence, and feature drivers. | Shared Granite workflow context and incident memory. | `risk_scoring_tool`, `rag_retrieval_tool` | Risk summary with drivers and uncertainty. |
| Volunteer Coordinator | Maps needs to volunteer and NGO operations. | Prioritize volunteer actions and coordination gaps. | Shared context and prior specialist outputs. | `rag_retrieval_tool`, `grounded_granite_tool` | Volunteer tasking plan. |
| Emergency Planner | Plans evacuation, access, shelter routing, and sequencing. | Convert risk and road findings into safe movement priorities. | Shared context plus risk and volunteer outputs. | `graph_analysis_tool`, `rag_retrieval_tool` | Evacuation and response plan. |
| Resource Allocator | Allocates medical teams, food, water, rescue teams, and shelters. | Assign scarce resources using risk, distance, availability, and priority. | Shared context plus risk, volunteer, and planning outputs. | `resource_allocation_tool`, `rag_retrieval_tool` | Explainable resource allocation plan. |
| Report Generator | Creates formal grounded outputs. | Generate reports and briefings only through RAG-grounded Granite. | Full prior workflow context. | `grounded_granite_tool`, `rag_retrieval_tool` | Incident report, NGO plan, authority briefing. |
| Citizen Assistant | Creates citizen-safe alert language. | Produce concise multilingual alerts from grounded guidance. | Shared context plus reporting output. | `grounded_granite_tool`, `rag_retrieval_tool` | Public alert messages. |

## REST API

- `GET /api/v1/agents/definitions`
- `POST /api/v1/agents/orchestrate`
- `POST /chat`

## Grounding Rule

Generated reports and alerts use the RAG-grounded Granite generation service. Report generation blocks unless RAG retrieval returns grounding contexts.
