from app.schemas.rag import KnowledgeDocumentInput, KnowledgeSourceType, RagIndexRequest


def test_rag_index_request_accepts_government_sop_document() -> None:
    request = RagIndexRequest(
        documents=[
            KnowledgeDocumentInput(
                document_id="sop-1",
                source_type=KnowledgeSourceType.GOVERNMENT_SOP,
                title="Flood SOP",
                text="Move residents to marked safe shelters.",
            )
        ]
    )

    assert request.documents[0].source_type == KnowledgeSourceType.GOVERNMENT_SOP
