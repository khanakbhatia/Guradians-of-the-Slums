# Production AI Architecture

## End-To-End Flow

```mermaid
flowchart TD
    satellite["Satellite Images"] --> cv["Computer Vision<br/>OpenCV + Pretrained YOLOv8"]
    cv --> graph["Graph AI<br/>NetworkX Road Connectivity"]
    graph --> risk["Risk Engine<br/>Flood + Fire + Overall Risk"]
    risk --> rag["RAG Retrieval<br/>LangChain + FAISS + Local Vectors"]
    rag --> granite["IBM Granite<br/>Grounded Generation + Agent Orchestration"]
    granite --> fastapi["FastAPI AI Service"]
    fastapi --> m2["M2 Express Backend"]
    m2 --> m1["M1 React Frontend"]
```

## Production Endpoint

```text
POST /api/v1/pipeline/run
```

This endpoint returns a stage-by-stage JSON trace for M2.

## Service Responsibilities

### Satellite

Input imagery is prepared by the data pipeline and analyzed by the CV service.

### CV

Detects buildings, roads, drainage, open spaces, and roof density.

Output:

- bounding boxes
- confidence
- optional geo coordinates
- summary counts

### Graph AI

Consumes road, building, and drainage inputs.

Output:

- road connectivity graph
- blocked roads
- evacuation bottlenecks
- shortest safe path

### Risk Engine

Consumes CV output, graph output, rainfall, and historical flood records.

Output:

- flood risk
- fire risk
- overall risk
- confidence
- explanations and visual overlays

### RAG

Retrieves grounded context from government SOPs, disaster guidelines, NGO manuals, historical reports, and municipal documents.

Output:

- retrieved contexts
- scores
- source metadata

### IBM Granite Grounded Generation

Generates only RAG-grounded text. It blocks report/alert responses when no grounding context is retrieved.

Output:

- incident reports
- citizen alerts
- NGO action plans
- authority briefings
- multilingual alerts
- citations

### Granite-Backed Agents

Coordinates specialized agents:

- Risk Analyst
- Volunteer Coordinator
- Emergency Planner
- Resource Allocator
- Report Generator
- Citizen Assistant

Output:

- task delegations
- shared memory
- reasoning flow
- agent outputs
- retry/failure records

### FastAPI

Owns AI service contracts and exposes versioned APIs plus M2 facade routes.

### M2 Backend

Consumes JSON from FastAPI and handles application concerns:

- authentication
- MongoDB persistence
- Socket.IO
- frontend-facing APIs
- user/session/business logic

## Deployment Boundary

M3 owns only the AI service. M2 calls FastAPI over REST. M1 never calls the AI service directly in production.
