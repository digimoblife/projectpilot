import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from projectpilot.persistence.models.handover import (
    HandoverItemStatus,
    HandoverItemType,
    HandoverStatus,
)


class HandoverItemCreateRequest(BaseModel):
    title: str
    description: Optional[str] = None
    item_type: HandoverItemType = HandoverItemType.CUSTOM
    required: bool = True
    sort_order: Optional[int] = 0


class HandoverItemUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    required: Optional[bool] = None
    status: Optional[HandoverItemStatus] = None
    related_document_id: Optional[uuid.UUID] = None
    waiver_reason: Optional[str] = None


class HandoverStatusUpdateRequest(BaseModel):
    target_status: HandoverStatus
    notes: Optional[str] = None


class HandoverItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    handover_id: uuid.UUID
    item_type: HandoverItemType
    title: str
    description: Optional[str] = None
    required: bool
    status: HandoverItemStatus
    related_document_id: Optional[uuid.UUID] = None
    waiver_reason: Optional[str] = None
    completed_at: Optional[datetime] = None
    completed_by_user_id: Optional[uuid.UUID] = None
    sort_order: int
    created_at: datetime
    updated_at: datetime


class HandoverResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    status: HandoverStatus
    started_at: Optional[datetime] = None
    ready_for_review_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    items: List[HandoverItemResponse] = []


class HandoverCompletionGateResponse(BaseModel):
    is_eligible: bool
    reasons: List[str]
    completed_count: int
    required_count: int
    total_count: int
