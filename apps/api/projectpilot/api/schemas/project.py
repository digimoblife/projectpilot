import uuid
from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from projectpilot.api.schemas.auth import UserResponse
from projectpilot.api.schemas.client import ClientSimpleResponse
from projectpilot.api.schemas.activity import ActivityEventResponse
from projectpilot.persistence.models.project import ProjectHealth, ProjectLifecycleStage


class ProjectBase(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    client_id: uuid.UUID
    start_date: Optional[date] = None
    target_completion_date: Optional[date] = None


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[date] = None
    target_completion_date: Optional[date] = None
    health: Optional[ProjectHealth] = None


class ProjectTransitionRequest(BaseModel):
    target_stage: ProjectLifecycleStage
    reason: Optional[str] = None


class ProjectResponse(ProjectBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    owner_id: uuid.UUID
    lifecycle_stage: ProjectLifecycleStage
    health: ProjectHealth
    actual_completion_date: Optional[date] = None
    created_at: datetime
    updated_at: datetime
    client: Optional[ClientSimpleResponse] = None
    owner: Optional[UserResponse] = None


class ProjectDetailResponse(ProjectResponse):
    activities: List[ActivityEventResponse] = []
