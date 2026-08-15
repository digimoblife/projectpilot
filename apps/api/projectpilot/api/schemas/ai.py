import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict
from projectpilot.persistence.models.ai import AIJobStatus, AISuggestionStatus


# --- AI Job Schemas ---
class AIJobCreate(BaseModel):
    job_type: str
    payload: Dict[str, Any] = {}


class AIJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: Optional[uuid.UUID] = None
    job_type: str
    status: AIJobStatus
    payload: Dict[str, Any]
    result: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    retry_count: int
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None


# --- AI Suggestion Schemas ---
class AISuggestionReviewRequest(BaseModel):
    action: AISuggestionStatus  # ACCEPTED, EDITED, REJECTED
    edited_data: Optional[Dict[str, Any]] = None
    review_notes: Optional[str] = None


class AISuggestionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    job_id: Optional[uuid.UUID] = None
    capability: str
    title: str
    suggested_data: Dict[str, Any]
    evidence_sources: Optional[Dict[str, Any]] = None
    status: AISuggestionStatus
    reviewed_by_id: Optional[uuid.UUID] = None
    reviewed_at: Optional[datetime] = None
    review_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# --- Synchronous Processing Schemas ---
class AISyncProcessRequest(BaseModel):
    capability: str
    payload: Dict[str, Any] = {}


class AISyncProcessResponse(BaseModel):
    capability: str
    result: Dict[str, Any]
    model_used: str
