import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from projectpilot.persistence.models.meeting import (
    ActionItemStatus,
    ConvertedEntityType,
    MeetingStatus,
    MeetingType,
    ParticipantType,
)


# --- Meeting Participant Schemas ---
class MeetingParticipantBase(BaseModel):
    participant_type: ParticipantType = ParticipantType.INTERNAL
    user_id: Optional[uuid.UUID] = None
    display_name_snapshot: str
    role_snapshot: Optional[str] = None


class MeetingParticipantCreate(MeetingParticipantBase):
    pass


class MeetingParticipantResponse(MeetingParticipantBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    meeting_id: uuid.UUID
    created_at: datetime


# --- Action Item Schemas ---
class ActionItemBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: ActionItemStatus = ActionItemStatus.OPEN
    owner_name: Optional[str] = None
    owner_user_id: Optional[uuid.UUID] = None
    due_date: Optional[datetime] = None


class ActionItemCreate(ActionItemBase):
    pass


class ActionItemUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ActionItemStatus] = None
    owner_name: Optional[str] = None
    owner_user_id: Optional[uuid.UUID] = None
    due_date: Optional[datetime] = None


class ActionItemConvertRequest(BaseModel):
    target_entity: ConvertedEntityType  # TASK, CLIENT_DEPENDENCY, ISSUE
    feature_id: Optional[uuid.UUID] = None  # Required if converting to Task


class ActionItemResponse(ActionItemBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    meeting_id: Optional[uuid.UUID] = None
    converted_entity_type: Optional[ConvertedEntityType] = None
    converted_entity_id: Optional[uuid.UUID] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


# --- Meeting Schemas ---
class MeetingBase(BaseModel):
    title: str
    meeting_type: MeetingType = MeetingType.WEEKLY_SYNC
    scheduled_at: Optional[datetime] = None
    occurred_at: Optional[datetime] = None
    notes: Optional[str] = None
    transcript: Optional[str] = None


class MeetingCreate(MeetingBase):
    participants: Optional[List[MeetingParticipantCreate]] = None


class MeetingUpdate(BaseModel):
    title: Optional[str] = None
    meeting_type: Optional[MeetingType] = None
    scheduled_at: Optional[datetime] = None
    occurred_at: Optional[datetime] = None
    notes: Optional[str] = None
    transcript: Optional[str] = None
    status: Optional[MeetingStatus] = None
    summary: Optional[str] = None


class MeetingResponse(MeetingBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    meeting_key: str
    status: MeetingStatus
    summary: Optional[str] = None
    created_by_user_id: Optional[uuid.UUID] = None
    finalized_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    participants: List[MeetingParticipantResponse] = []
    action_items: List[ActionItemResponse] = []
