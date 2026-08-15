import uuid
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict


class SearchResultItem(BaseModel):
    entity_type: str
    entity_id: uuid.UUID
    project_id: Optional[uuid.UUID] = None
    key: str
    title: str
    subtitle: Optional[str] = None
    route: str


class GlobalSearchResponse(BaseModel):
    query: str
    total_count: int
    results: List[SearchResultItem]


class ProjectSearchResponse(BaseModel):
    project_id: uuid.UUID
    query: str
    total_count: int
    results: List[SearchResultItem]


class EvidenceCitation(BaseModel):
    key: str
    type: str
    title: str
    route: str


class ProjectQARequest(BaseModel):
    question: str


class ProjectQAResponse(BaseModel):
    project_id: uuid.UUID
    question: str
    answer: str
    citations: List[EvidenceCitation] = []
    evidence_count: int
