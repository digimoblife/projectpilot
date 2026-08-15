import uuid
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from projectpilot.api.schemas.auth import UserResponse
from projectpilot.api.schemas.client import ClientSimpleResponse
from projectpilot.api.schemas.project import ProjectResponse
from projectpilot.persistence.models.lead import LeadStatus


class LeadBase(BaseModel):
    name: str
    company_name: str
    client_id: Optional[uuid.UUID] = None
    client_pic_name: Optional[str] = None
    client_pic_email: Optional[str] = None
    client_pic_phone: Optional[str] = None
    project_type: Optional[str] = None
    source: Optional[str] = None
    opportunity_description: Optional[str] = None
    estimated_budget_note: Optional[str] = None
    brief_notes: Optional[str] = None


class LeadCreate(LeadBase):
    pass


class LeadUpdate(BaseModel):
    name: Optional[str] = None
    company_name: Optional[str] = None
    client_id: Optional[uuid.UUID] = None
    client_pic_name: Optional[str] = None
    client_pic_email: Optional[str] = None
    client_pic_phone: Optional[str] = None
    project_type: Optional[str] = None
    source: Optional[str] = None
    opportunity_description: Optional[str] = None
    estimated_budget_note: Optional[str] = None
    brief_notes: Optional[str] = None


class LeadStatusUpdate(BaseModel):
    target_status: LeadStatus
    loss_reason: Optional[str] = None


class LeadConvertRequest(BaseModel):
    project_code: str
    project_name: str
    description: Optional[str] = None
    start_date: Optional[date] = None
    target_completion_date: Optional[date] = None


class LeadResponse(LeadBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    owner_id: uuid.UUID
    status: LeadStatus
    loss_reason: Optional[str] = None
    converted_project_id: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime

    client: Optional[ClientSimpleResponse] = None
    owner: Optional[UserResponse] = None
    converted_project: Optional[ProjectResponse] = None
