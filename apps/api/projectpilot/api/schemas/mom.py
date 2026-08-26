import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict


class MoMGenerateRequest(BaseModel):
    raw_text: str
    title: Optional[str] = None
    meeting_date: Optional[datetime] = None
    project_id: Optional[uuid.UUID] = None
    project_name: Optional[str] = None
    attendees: Optional[List[str]] = None
    attendees_raw: Optional[str] = None


class MoMUpdateRequest(BaseModel):
    title: Optional[str] = None
    content_md: Optional[str] = None
    summary: Optional[str] = None
    meeting_date: Optional[datetime] = None
    project_id: Optional[uuid.UUID] = None
    project_name: Optional[str] = None
    attendees: Optional[List[str]] = None


class MoMDocumentResponse(BaseModel):
    id: uuid.UUID
    mom_key: str
    title: str
    meeting_date: Optional[datetime] = None
    project_id: Optional[uuid.UUID] = None
    project_name: Optional[str] = None
    project_code: Optional[str] = None
    raw_text: str
    content_md: str
    summary: Optional[str] = None
    attendees: Optional[List[str]] = None
    action_items: Optional[List[Dict[str, Any]]] = None
    decisions: Optional[List[str]] = None
    created_by_user_id: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MoMListItemResponse(BaseModel):
    id: uuid.UUID
    mom_key: str
    title: str
    meeting_date: Optional[datetime] = None
    project_id: Optional[uuid.UUID] = None
    project_name: Optional[str] = None
    project_code: Optional[str] = None
    summary: Optional[str] = None
    action_items_count: int = 0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
