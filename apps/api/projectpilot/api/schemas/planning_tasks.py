import uuid
from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from projectpilot.persistence.models.planning_tasks import TaskStatus


# --- Epic Schemas ---
class EpicBase(BaseModel):
    key: str
    title: str
    description: Optional[str] = None
    status: Optional[str] = "PLANNED"


class EpicCreate(EpicBase):
    pass


class EpicUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None


class EpicResponse(EpicBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


# --- Feature Schemas ---
class FeatureBase(BaseModel):
    key: str
    title: str
    description: Optional[str] = None
    epic_id: Optional[uuid.UUID] = None
    requirement_id: Optional[uuid.UUID] = None
    status: Optional[str] = "PLANNED"


class FeatureCreate(FeatureBase):
    pass


class FeatureUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    epic_id: Optional[uuid.UUID] = None
    requirement_id: Optional[uuid.UUID] = None
    status: Optional[str] = None


class FeatureResponse(FeatureBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


# --- Task Schemas ---
class TaskBase(BaseModel):
    key: str
    title: str
    description: Optional[str] = None
    epic_id: Optional[uuid.UUID] = None
    feature_id: Optional[uuid.UUID] = None
    requirement_id: Optional[uuid.UUID] = None
    scope_item_id: Optional[uuid.UUID] = None
    parent_task_id: Optional[uuid.UUID] = None
    priority: Optional[str] = "MEDIUM"
    start_date: Optional[date] = None
    due_date: Optional[date] = None
    estimated_hours: Optional[float] = None
    actual_hours: Optional[float] = None
    assignee_name: Optional[str] = None
    order_index: Optional[int] = 0


class TaskCreate(TaskBase):
    status: Optional[TaskStatus] = TaskStatus.BACKLOG


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    epic_id: Optional[uuid.UUID] = None
    feature_id: Optional[uuid.UUID] = None
    requirement_id: Optional[uuid.UUID] = None
    scope_item_id: Optional[uuid.UUID] = None
    parent_task_id: Optional[uuid.UUID] = None
    priority: Optional[str] = None
    start_date: Optional[date] = None
    due_date: Optional[date] = None
    estimated_hours: Optional[float] = None
    actual_hours: Optional[float] = None
    assignee_name: Optional[str] = None
    order_index: Optional[int] = None


class TaskStatusUpdate(BaseModel):
    target_status: TaskStatus
    blocker_reason: Optional[str] = None


class TaskResponse(TaskBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    status: TaskStatus
    blocker_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime
