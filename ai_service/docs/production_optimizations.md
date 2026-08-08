# Production AI Optimizations

## Caching

Implemented:

- process-local TTL cache in `app/core/cache.py`
- stable request hashing for deterministic reuse
- graph, risk, RAG, Granite, and BeeAI cache namespaces

Recommended production upgrade:

- replace process-local cache with Redis
- include tenant, incident, and data-version IDs in cache keys
- invalidate cache when satellite tile, road graph, SOP index, or risk inputs change

## Parallel Processing

Implemented:

- `IntegratedAIPipeline` runs independent Graph AI, Risk, and RAG stages concurrently using `asyncio.gather`
- CPU/blocking deterministic services are wrapped with `asyncio.to_thread`

Recommended production upgrade:

- offload CV and batch RAG indexing to worker queues
- use async job IDs for long-running satellite tiles

## Memory

Implemented:

- BeeAI incident shared memory for multi-agent context
- bounded process caches to prevent unbounded growth

Recommended production upgrade:

- persist BeeAI memory summaries to MongoDB through M2
- store only summaries and IDs in agent memory, not full raw imagery or long reports

## Latency

Implemented:

- reusable stage outputs
- parallel independent stages
- short JSON stage trace for M2

Recommended production upgrade:

- precompute CV and graph outputs for known settlements
- warm FAISS indexes on startup
- separate low-latency citizen alert path from heavy report generation

## Prompt Optimization

Implemented:

- reusable grounded prompt templates
- concise output structures
- strict instruction to use only retrieved context

Recommended production upgrade:

- use shorter prompts for citizen alerts
- cap retrieved chunks by audience
- summarize long retrieved chunks before Granite generation
- keep few-shot examples minimal and audience-specific

## Cost Optimization

Implemented:

- Granite generation cache
- RAG-first blocking to avoid ungrounded wasted calls
- deterministic local scoring for risk, routing, volunteer matching, and allocation

Recommended production upgrade:

- call Granite only for user-facing natural language artifacts
- reuse one grounded generation for authority and admin summaries when possible
- use smaller Granite models for alerts and larger models only for briefings

## Result Reuse

Implemented:

- Graph AI, Risk, RAG, Granite, and BeeAI outputs are cacheable by request hash

Recommended production upgrade:

- store final stage outputs under `incident_id`
- make M2 pass existing stage outputs back into `/api/v1/pipeline/run`
- expose cache-hit metrics in health/observability endpoints
