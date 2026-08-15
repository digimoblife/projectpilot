import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from projectpilot.persistence.models.discovery import DiscoveryCategory, DiscoveryQuestionStatus


# --- Brief Schemas ---
class BriefBase(BaseModel):
    objective: str
    business_context: Optional[str] = None
    intended_users: Optional[str] = None
    expected_functionality: Optional[str] = None
    constraints: Optional[str] = None
    known_integrations: Optional[str] = None
    raw_content: Optional[str] = None


class BriefCreateUpdate(BriefBase):
    pass


class BriefResponse(BriefBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


# --- Client Answer Schemas ---
class ClientAnswerBase(BaseModel):
    answer_text: str
    respondent_name: Optional[str] = None
    respondent_role: Optional[str] = None
    source: Optional[str] = None


class ClientAnswerCreate(ClientAnswerBase):
    pass


class ClientAnswerResponse(ClientAnswerBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    question_id: uuid.UUID
    answered_at: datetime
    created_at: datetime
    updated_at: datetime


# --- Discovery Question Schemas ---
class DiscoveryQuestionBase(BaseModel):
    category: DiscoveryCategory
    question: str
    rationale: Optional[str] = None
    priority: Optional[str] = "MEDIUM"
    parent_question_id: Optional[uuid.UUID] = None
    order_index: Optional[int] = 0


class DiscoveryQuestionCreate(DiscoveryQuestionBase):
    pass


class DiscoveryQuestionUpdate(BaseModel):
    category: Optional[DiscoveryCategory] = None
    question: Optional[str] = None
    rationale: Optional[str] = None
    priority: Optional[str] = None
    parent_question_id: Optional[uuid.UUID] = None
    order_index: Optional[int] = None


class DiscoveryQuestionStatusUpdate(BaseModel):
    target_status: DiscoveryQuestionStatus


class DiscoveryQuestionResponse(DiscoveryQuestionBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    status: DiscoveryQuestionStatus
    created_at: datetime
    updated_at: datetime
    answers: List[ClientAnswerResponse] = []
