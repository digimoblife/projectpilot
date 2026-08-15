import enum
import uuid
from datetime import date, datetime
from typing import Optional
from sqlalchemy import Date, DateTime, Enum, ForeignKey, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from projectpilot.persistence.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class IssueStatus(str, enum.Enum):
    OPEN = "OPEN"
    IN_INVESTIGATION = "IN_INVESTIGATION"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"
    WONT_FIX = "WONT_FIX"


class RiskStatus(str, enum.Enum):
    IDENTIFIED = "IDENTIFIED"
    MONITORED = "MONITORED"
    MATERIALIZED = "MATERIALIZED"
    MITIGATED = "MITIGATED"
    CLOSED = "CLOSED"


class BlockerStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    RESOLVED = "RESOLVED"
    ESCALATED = "ESCALATED"


class ClientDependencyStatus(str, enum.Enum):
    REQUESTED = "REQUESTED"
    IN_PROGRESS = "IN_PROGRESS"
    PROVIDED = "PROVIDED"
    OVERDUE = "OVERDUE"
    CANCELLED = "CANCELLED"


# --- Issue Model ---
class Issue(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "issues"

    project_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False
    )
    source_risk_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("risks.id", ondelete="SET NULL", use_alter=True), nullable=True, index=True
    )
    key: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    severity: Mapped[str] = mapped_column(String(50), default="MEDIUM", nullable=False)
    status: Mapped[IssueStatus] = mapped_column(
        Enum(IssueStatus, name="issue_status"),
        default=IssueStatus.OPEN,
        nullable=False,
        index=True,
    )
    resolution_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    project: Mapped["Project"] = relationship("Project")


# --- Risk Model ---
class Risk(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "risks"

    project_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False
    )
    materialized_issue_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("issues.id", ondelete="SET NULL"), nullable=True, index=True
    )
    key: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    probability: Mapped[str] = mapped_column(String(50), default="MEDIUM", nullable=False)
    impact: Mapped[str] = mapped_column(String(50), default="MEDIUM", nullable=False)
    mitigation_plan: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[RiskStatus] = mapped_column(
        Enum(RiskStatus, name="risk_status"),
        default=RiskStatus.IDENTIFIED,
        nullable=False,
        index=True,
    )

    # Relationships
    project: Mapped["Project"] = relationship("Project")


# --- Blocker Model ---
class Blocker(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "blockers"

    project_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False
    )
    task_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True, index=True
    )
    key: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    blocker_type: Mapped[str] = mapped_column(String(50), default="TECHNICAL", nullable=False)
    status: Mapped[BlockerStatus] = mapped_column(
        Enum(BlockerStatus, name="blocker_status"),
        default=BlockerStatus.ACTIVE,
        nullable=False,
        index=True,
    )
    resolution_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    project: Mapped["Project"] = relationship("Project")
    task: Mapped[Optional["Task"]] = relationship("Task")


# --- Client Dependency Model ---
class ClientDependency(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "client_dependencies"

    project_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False
    )
    task_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True, index=True
    )
    milestone_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("milestones.id", ondelete="SET NULL"), nullable=True, index=True
    )
    blocker_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("blockers.id", ondelete="SET NULL"), nullable=True, index=True
    )

    key: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    dependency_type: Mapped[str] = mapped_column(String(50), default="CREDENTIALS", nullable=False)
    status: Mapped[ClientDependencyStatus] = mapped_column(
        Enum(ClientDependencyStatus, name="client_dependency_status"),
        default=ClientDependencyStatus.REQUESTED,
        nullable=False,
        index=True,
    )
    requested_date: Mapped[date] = mapped_column(Date, nullable=False)
    expected_date: Mapped[date] = mapped_column(Date, nullable=False)
    provided_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    impact_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    project: Mapped["Project"] = relationship("Project")
