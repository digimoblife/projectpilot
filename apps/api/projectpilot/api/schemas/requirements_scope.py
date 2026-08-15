import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from projectpilot.persistence.models.discovery import DiscoveryCategory
from projectpilot.persistence.models.requirements_scope import (
    DecisionStatus,
    RequirementSourceType,
    RequirementStatus,
    ScopeChangeStatus,
    ScopeType,
)


# --- Requirement Schemas ---
class RequirementBase(BaseModel):
    key: str
    title: str
    description: str
    category: DiscoveryCategory
    priority: Optional[str] = "MEDIUM"
    source_type: Optional[RequirementSourceType] = RequirementSourceType.MANUAL_PM
    source_id: Optional[uuid.UUID] = None
    acceptance_criteria: Optional[str] = None
    rationale: Optional[str] = None


class RequirementCreate(RequirementBase):
    pass


class RequirementUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[DiscoveryCategory] = None
    priority: Optional[str] = None
    source_type: Optional[RequirementSourceType] = None
    source_id: Optional[uuid.UUID] = None
    acceptance_criteria: Optional[str] = None
    rationale: Optional[str] = None


class RequirementStatusUpdate(BaseModel):
    target_status: RequirementStatus


class RequirementSupersedeRequest(BaseModel):
    title: str
    description: str
    category: Optional[DiscoveryCategory] = None
    priority: Optional[str] = None
    acceptance_criteria: Optional[str] = None
    rationale: Optional[str] = None


class RequirementResponse(RequirementBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    status: RequirementStatus
    version: int
    superseded_by_id: Optional[uuid.UUID] = None
    supersedes_id: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime


# --- Decision Schemas ---
class DecisionBase(BaseModel):
    key: str
    title: str
    context: str
    decision: str
    rationale: Optional[str] = None
    implications: Optional[str] = None
    decided_by: Optional[str] = None


class DecisionCreate(DecisionBase):
    pass


class DecisionUpdate(BaseModel):
    title: Optional[str] = None
    context: Optional[str] = None
    decision: Optional[str] = None
    rationale: Optional[str] = None
    implications: Optional[str] = None
    decided_by: Optional[str] = None


class DecisionStatusUpdate(BaseModel):
    target_status: DecisionStatus


class DecisionResponse(DecisionBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    status: DecisionStatus
    superseded_by_id: Optional[uuid.UUID] = None
    decided_at: datetime
    created_at: datetime
    updated_at: datetime


# --- Scope Item Schemas ---
class ScopeItemBase(BaseModel):
    title: str
    description: Optional[str] = None
    scope_type: ScopeType = ScopeType.IN_SCOPE
    requirement_id: Optional[uuid.UUID] = None
    rationale: Optional[str] = None


class ScopeItemCreate(ScopeItemBase):
    pass


class ScopeItemUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    scope_type: Optional[ScopeType] = None
    requirement_id: Optional[uuid.UUID] = None
    rationale: Optional[str] = None


class ScopeItemResponse(ScopeItemBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


# --- Scope Change Schemas ---
class ScopeChangeBase(BaseModel):
    key: str
    title: str
    description: str
    reason: str
    impact_summary: Optional[str] = None
    requested_by: Optional[str] = None


class ScopeChangeCreate(ScopeChangeBase):
    pass


class ScopeChangeUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    reason: Optional[str] = None
    impact_summary: Optional[str] = None
    requested_by: Optional[str] = None


class ScopeChangeStatusUpdate(BaseModel):
    target_status: ScopeChangeStatus
    approved_by: Optional[str] = None


class ScopeChangeResponse(ScopeChangeBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    status: ScopeChangeStatus
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
