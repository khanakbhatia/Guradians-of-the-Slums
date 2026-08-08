# AI Service Architecture

## Ownership

This folder is owned by M3 and contains only AI-service architecture.

## Layers

1. `app/api/v1`
   FastAPI route boundaries for AI capabilities.

2. `app/schemas`
   Pydantic request and response contracts.

3. `app/services`
   Domain service boundaries for CV, graph AI, risk, RAG, Granite, BeeAI, explainability, matching, and planning.

4. `app/integrations`
   External IBM and storage integration boundaries.

5. `app/pipelines`
   Batch, async, and offline pipeline boundaries for data preparation and indexing.

6. `app/repositories`
   Persistence boundaries for vectors, artifacts, and geospatial indexes.

7. `data`
   Local development placeholders for raw data, processed data, reference material, model artifacts, and FAISS indexes.

## Required Design Rules

- Data preprocessing must use IBM Data Prep Kit for cataloging, transformation, validation, and lineage.
- Granite answers must be produced through RAG context.
- BeeAI must coordinate multiple specialized agents.
- CV, graph, risk, RAG, LLM, planning, and matching modules must expose reusable service APIs.
- Frontend and Express backend business logic must remain outside this service.
