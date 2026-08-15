import enum
import uuid
from datetime import date, datetime
from typing import Any, Dict, List, Optional
from sqlalchemy import Date, DateTime, Enum, ForeignKey, Integer, JSON, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from projectpilot.persistence.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class ReportType(str, enum.Enum):
    WEEKLY_INTERNAL = "WEEKLY_INTERNAL"
    WEEKLY_CLIENT = "WEEKLY_CLIENT"
    MONTHLY_INTERNAL = "MONTHLY_INTERNAL"
    MONTHLY_CLIENT = "MONTHLY_CLIENT"


class ReportStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    UNDER_REVIEW = "UNDER_REVIEW"
    FINAL = "FINAL"
    SUPERSEDED = "SUPERSEDED"


class Report(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "reports"

    project_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False
    )
    report_key: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    report_type: Mapped[ReportType] = mapped_column(
        Enum(ReportType, name="report_type"),
        default=ReportType.WEEKLY_INTERNAL,
        nullable=False,
        index=True,
    )
    reporting_period_start: Mapped[date] = mapped_column(Date, nullable=False)
    reporting_period_end: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[ReportStatus] = mapped_column(
        Enum(ReportStatus, name="report_status"),
        default=ReportStatus.DRAFT,
        nullable=False,
        index=True,
    )
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_by_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    finalized_by_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    finalized_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    supersedes_report_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("reports.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # Relationships
    project: Mapped["Project"] = relationship("Project")
    created_by: Mapped[Optional["User"]] = relationship("User", foreign_keys=[created_by_user_id])
    finalized_by: Mapped[Optional["User"]] = relationship("User", foreign_keys=[finalized_by_user_id])
    evidences: Mapped[List["ReportEvidence"]] = relationship(
        "ReportEvidence", back_populates="report", cascade="all, delete-orphan"
    )


class ReportEvidence(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "report_evidences"

    report_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("reports.id", ondelete="CASCADE"), index=True, nullable=False
    )
    evidence_type: Mapped[str] = mapped_column(String(50), nullable=False)
    evidence_entity_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid(as_uuid=True), nullable=True, index=True)
    evidence_snapshot: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)

    # Relationships
    report: Mapped["Report"] = relationship("Report", back_populates="evidences")
