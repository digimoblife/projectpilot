import uuid
from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, model_validator


# --- Scrum Entry Schemas ---
class ScrumEntryBase(BaseModel):
    member_name: str
    what_done: str
    issues: Optional[str] = None
    what_next: str
    order_index: int = 0


class ScrumEntryCreate(ScrumEntryBase):
    member_id: Optional[uuid.UUID] = None


class ScrumEntryUpdate(BaseModel):
    member_id: Optional[uuid.UUID] = None
    member_name: Optional[str] = None
    what_done: Optional[str] = None
    issues: Optional[str] = None
    what_next: Optional[str] = None
    order_index: Optional[int] = None


class ScrumEntryResponse(ScrumEntryBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    session_id: uuid.UUID
    project_id: uuid.UUID
    member_id: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime


# --- Scrum Session Schemas ---
class ScrumSessionBase(BaseModel):
    session_date: date
    notes: Optional[str] = None


class ScrumSessionCreate(ScrumSessionBase):
    pass


class ScrumSessionUpdate(BaseModel):
    notes: Optional[str] = None


class ScrumSessionResponse(ScrumSessionBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    week_number: int
    week_year: int
    facilitator_id: Optional[uuid.UUID] = None
    entries: List[ScrumEntryResponse] = []
    created_at: datetime
    updated_at: datetime


# --- Scrum Weekly Report Schemas ---
class ScrumWeeklyReportBase(BaseModel):
    week_number: int
    week_year: int
    session_count: int = 0
    ai_summary: Optional[str] = None
    report_markdown: Optional[str] = None


class ScrumWeeklyReportResponse(ScrumWeeklyReportBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    generated_by_id: Optional[uuid.UUID] = None
    generated_at: Optional[datetime] = None
    created_at: datetime

    @model_validator(mode="after")
    def set_generated_at(self):
        if self.generated_at is None:
            self.generated_at = self.created_at
        return self


# --- Helper Schemas ---
class ScrumWeekInfo(BaseModel):
    week_number: int
    week_year: int
    start_date: date
    end_date: date
    session_count: int
    already_generated: bool
    report_id: Optional[uuid.UUID] = None


class ScrumWeekPreview(ScrumWeekInfo):
    sessions: List[ScrumSessionResponse]
