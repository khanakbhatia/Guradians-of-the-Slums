"""Knowledge document loading for the retrieval-only RAG pipeline."""

from __future__ import annotations

import csv
import json
from pathlib import Path

from app.schemas.rag import KnowledgeDocumentInput, KnowledgeSourceType


SOURCE_TYPE_BY_FOLDER = {
    "government_sops": KnowledgeSourceType.GOVERNMENT_SOP,
    "disaster_guidelines": KnowledgeSourceType.DISASTER_GUIDELINE,
    "ngo_manuals": KnowledgeSourceType.NGO_MANUAL,
    "historical_disaster_reports": KnowledgeSourceType.HISTORICAL_DISASTER_REPORT,
    "municipal_documents": KnowledgeSourceType.MUNICIPAL_DOCUMENT,
}


class KnowledgeDocumentLoader:
    """Load knowledge files from local source folders."""

    def load_paths(self, source_paths: list[str]) -> list[KnowledgeDocumentInput]:
        documents: list[KnowledgeDocumentInput] = []
        for source_path in source_paths:
            path = Path(source_path)
            if path.is_dir():
                for file_path in path.rglob("*"):
                    if file_path.is_file():
                        documents.extend(self._load_file(file_path))
            elif path.is_file():
                documents.extend(self._load_file(path))
        return documents

    def _load_file(self, file_path: Path) -> list[KnowledgeDocumentInput]:
        suffix = file_path.suffix.lower()
        if suffix in {".txt", ".md"}:
            return [self._text_document(file_path, file_path.read_text(encoding="utf-8"))]
        if suffix == ".json":
            return self._json_documents(file_path)
        if suffix == ".jsonl":
            return self._jsonl_documents(file_path)
        if suffix == ".csv":
            return self._csv_documents(file_path)
        return []

    def _text_document(self, file_path: Path, text: str) -> KnowledgeDocumentInput:
        return KnowledgeDocumentInput(
            document_id=self._document_id(file_path),
            source_type=self._source_type(file_path),
            title=file_path.stem.replace("_", " ").title(),
            text=text,
            source_uri=str(file_path),
        )

    def _json_documents(self, file_path: Path) -> list[KnowledgeDocumentInput]:
        payload = json.loads(file_path.read_text(encoding="utf-8"))
        records = payload if isinstance(payload, list) else [payload]
        return [self._record_document(file_path, index, record) for index, record in enumerate(records)]

    def _jsonl_documents(self, file_path: Path) -> list[KnowledgeDocumentInput]:
        documents: list[KnowledgeDocumentInput] = []
        for index, line in enumerate(file_path.read_text(encoding="utf-8").splitlines()):
            if line.strip():
                documents.append(self._record_document(file_path, index, json.loads(line)))
        return documents

    def _csv_documents(self, file_path: Path) -> list[KnowledgeDocumentInput]:
        documents: list[KnowledgeDocumentInput] = []
        with file_path.open("r", encoding="utf-8", newline="") as csv_file:
            for index, record in enumerate(csv.DictReader(csv_file)):
                documents.append(self._record_document(file_path, index, record))
        return documents

    def _record_document(
        self,
        file_path: Path,
        index: int,
        record: dict,
    ) -> KnowledgeDocumentInput:
        text = str(record.get("text") or record.get("content") or record.get("body") or record)
        return KnowledgeDocumentInput(
            document_id=str(record.get("document_id") or f"{self._document_id(file_path)}:{index}"),
            source_type=self._source_type(file_path, record.get("source_type")),
            title=str(record.get("title") or file_path.stem.replace("_", " ").title()),
            text=text,
            source_uri=str(record.get("source_uri") or file_path),
            published_at=record.get("published_at"),
            jurisdiction=record.get("jurisdiction"),
            tags=record.get("tags") or [],
        )

    @staticmethod
    def _document_id(file_path: Path) -> str:
        return file_path.as_posix().replace("/", ":").replace("\\", ":")

    @staticmethod
    def _source_type(
        file_path: Path,
        explicit_source_type: str | None = None,
    ) -> KnowledgeSourceType:
        if explicit_source_type:
            return KnowledgeSourceType(explicit_source_type)

        folder_names = {part.lower() for part in file_path.parts}
        for folder_name, source_type in SOURCE_TYPE_BY_FOLDER.items():
            if folder_name in folder_names:
                return source_type
        return KnowledgeSourceType.DISASTER_GUIDELINE
