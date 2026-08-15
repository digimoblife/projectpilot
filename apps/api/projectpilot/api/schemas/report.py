import uuid
from datetime import date, datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict
from projectpilot.persistence.models.report import ReportStatus, ReportType


class ReportEvidenceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    evidence_type: str
    evidence_entity_id: Optional[uuid.UUID] = None
    evidence_snapshot: Optional[Dict[str, Any]] = None
    created_at: datetime


class ReportGenerateRequest(BaseModel):
    report_type: ReportType = ReportType.WEEKLY_INTERNAL
    reporting_period_start: date
    reporting_period_end: date
    custom_instructions: Optional[str] = None


class ReportUpdateRequest(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    summary: Optional[str] = None
    status: Optional[ReportStatus] = None


class ReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    report_key: str
    report_type: ReportType
    reporting_period_start: date
    reporting_period_end: date
    status: ReportStatus
    version: int
    title: str
    content: str
    summary: Optional[str] = None
    created_by_user_id: Optional[uuid.UUID] = None
    finalized_by_user_id: Optional[uuid.UUID] = None
    finalized_at: Optional[datetime] = None
    supersedes_report_id: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime
    evidences: List[ReportEvidenceResponse] = []


class PortfolioReportItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    project_name: str
    project_code: str
    report_key: str
    report_type: ReportType
    reporting_period_start: date
    reporting_period_end: date
    status: ReportStatus
    version: int
    title: str
    summary: Optional[str] = None
    created_at: datetime
    finalized_at: Optional[datetime] = None
