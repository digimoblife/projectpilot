import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict
from projectpilot.persistence.models.document import DocumentStatus, DocumentType


class DocumentEvidenceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    evidence_type: str
    evidence_entity_id: Optional[uuid.UUID] = None
    evidence_snapshot: Optional[Dict[str, Any]] = None
    created_at: datetime


class DocumentGenerateRequest(BaseModel):
    document_type: DocumentType = DocumentType.FSD
    custom_instructions: Optional[str] = None


class DocumentUpdateRequest(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    summary: Optional[str] = None
    status: Optional[DocumentStatus] = None


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    document_key: str
    document_type: DocumentType
    title: str
    status: DocumentStatus
    version: int
    content: str
    summary: Optional[str] = None
    created_by_user_id: Optional[uuid.UUID] = None
    finalized_by_user_id: Optional[uuid.UUID] = None
    finalized_at: Optional[datetime] = None
    supersedes_document_id: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime
    evidences: List[DocumentEvidenceResponse] = []


class PortfolioDocumentItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    project_name: str
    project_code: str
    document_key: str
    document_type: DocumentType
    title: str
    status: DocumentStatus
    version: int
    summary: Optional[str] = None
    created_at: datetime
    finalized_at: Optional[datetime] = None
