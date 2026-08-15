import uuid
from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from projectpilot.persistence.models.planning_tasks import TaskStatus
from projectpilot.persistence.models.timeline_team import MilestoneStatus


# --- Project Member Schemas ---
class ProjectMemberBase(BaseModel):
    name: str
    email: Optional[str] = None
    role: str = "TEAM_MEMBER"
    capacity_hours_per_week: Optional[float] = 40.0
    user_id: Optional[uuid.UUID] = None


class ProjectMemberCreate(ProjectMemberBase):
    pass


class ProjectMemberUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    capacity_hours_per_week: Optional[float] = None
    user_id: Optional[uuid.UUID] = None


class ProjectMemberResponse(ProjectMemberBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


# --- Milestone Schemas ---
class MilestoneBase(BaseModel):
    key: str
    title: str
    description: Optional[str] = None
    target_date: date


class MilestoneCreate(MilestoneBase):
    pass


class MilestoneUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    target_date: Optional[date] = None
    actual_date: Optional[date] = None


class MilestoneStatusUpdate(BaseModel):
    target_status: MilestoneStatus
    actual_date: Optional[date] = None


class MilestoneResponse(MilestoneBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    status: MilestoneStatus
    actual_date: Optional[date] = None
    created_at: datetime
    updated_at: datetime


# --- Task Dependency Schemas ---
class TaskDependencyCreate(BaseModel):
    predecessor_task_id: uuid.UUID
    successor_task_id: uuid.UUID
    dependency_type: Optional[str] = "FINISH_TO_START"


class TaskDependencyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    predecessor_task_id: uuid.UUID
    successor_task_id: uuid.UUID
    dependency_type: str
    created_at: datetime


# --- My Work Schemas ---
class MyWorkTaskItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    project_code: str
    project_name: str
    key: str
    title: str
    status: TaskStatus
    priority: str
    due_date: Optional[date] = None
    assignee_name: Optional[str] = None
    blocker_reason: Optional[str] = None
