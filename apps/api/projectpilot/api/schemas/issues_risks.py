import uuid
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from projectpilot.persistence.models.issues_risks import (
    BlockerStatus,
    ClientDependencyStatus,
    IssueStatus,
    RiskStatus,
)


# --- Issue Schemas ---
class IssueBase(BaseModel):
    key: str
    title: str
    description: Optional[str] = None
    severity: str = "MEDIUM"


class IssueCreate(IssueBase):
    source_risk_id: Optional[uuid.UUID] = None


class IssueUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[str] = None
    resolution_notes: Optional[str] = None


class IssueStatusUpdate(BaseModel):
    target_status: IssueStatus
    resolution_notes: Optional[str] = None


class IssueResponse(IssueBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    status: IssueStatus
    source_risk_id: Optional[uuid.UUID] = None
    resolution_notes: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


# --- Risk Schemas ---
class RiskBase(BaseModel):
    key: str
    title: str
    description: Optional[str] = None
    probability: str = "MEDIUM"
    impact: str = "MEDIUM"
    mitigation_plan: Optional[str] = None


class RiskCreate(RiskBase):
    pass


class RiskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    probability: Optional[str] = None
    impact: Optional[str] = None
    mitigation_plan: Optional[str] = None


class RiskStatusUpdate(BaseModel):
    target_status: RiskStatus


class RiskResponse(RiskBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    status: RiskStatus
    materialized_issue_id: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime


# --- Blocker Schemas ---
class BlockerBase(BaseModel):
    key: str
    title: str
    description: Optional[str] = None
    blocker_type: str = "TECHNICAL"
    task_id: Optional[uuid.UUID] = None


class BlockerCreate(BlockerBase):
    pass


class BlockerStatusUpdate(BaseModel):
    target_status: BlockerStatus
    resolution_notes: Optional[str] = None


class BlockerResponse(BlockerBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    status: BlockerStatus
    resolution_notes: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


# --- Client Dependency Schemas ---
class ClientDependencyBase(BaseModel):
    key: str
    title: str
    description: Optional[str] = None
    dependency_type: str = "CREDENTIALS"
    requested_date: date
    expected_date: date
    impact_summary: Optional[str] = None
    task_id: Optional[uuid.UUID] = None
    milestone_id: Optional[uuid.UUID] = None
    blocker_id: Optional[uuid.UUID] = None


class ClientDependencyCreate(ClientDependencyBase):
    pass


class ClientDependencyUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    dependency_type: Optional[str] = None
    expected_date: Optional[date] = None
    impact_summary: Optional[str] = None
    task_id: Optional[uuid.UUID] = None
    milestone_id: Optional[uuid.UUID] = None
    blocker_id: Optional[uuid.UUID] = None


class ClientDependencyStatusUpdate(BaseModel):
    target_status: ClientDependencyStatus
    provided_date: Optional[date] = None


class ClientDependencyResponse(ClientDependencyBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    status: ClientDependencyStatus
    provided_date: Optional[date] = None
    waiting_days: int = 0
    is_overdue: bool = False
    created_at: datetime
    updated_at: datetime
