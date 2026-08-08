# AI Service Architecture

M3-owned FastAPI service architecture for disaster preparedness AI capabilities.

This scaffold intentionally contains no implementation logic. It defines the module boundaries for:

- IBM Data Prep Kit satellite imagery preparation
- OpenCV and YOLOv8 computer vision
- NetworkX graph intelligence
- GeoPandas and Rasterio geospatial processing
- NumPy and Pandas feature engineering
- FAISS and LangChain retrieval
- IBM watsonx.ai SDK and IBM Granite generation
- IBM BeeAI multi-agent orchestration
- Risk prediction, explainability, volunteer matching, and evacuation planning

## Service Boundary

This service owns AI workflows only. React frontend work, Express backend business logic, MongoDB application models, authentication, Socket.IO, and non-AI APIs belong outside this folder unless explicitly requested.

## Top-Level Flow

Satellite imagery and external signals enter through ingestion pipelines, are prepared by IBM Data Prep Kit, analyzed by CV and geospatial modules, converted into graph and risk features, retrieved through RAG, reasoned over by Granite, coordinated by BeeAI agents, and exposed through FastAPI routers.
