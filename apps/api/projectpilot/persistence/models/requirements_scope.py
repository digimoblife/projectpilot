import enum
import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from projectpilot.persistence.base import Base, TimestampMixin, UUIDPrimaryKeyMixin, utc_now
from projectpilot.persistence.models.discovery import DiscoveryCategory


class RequirementStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    NEEDS_CLARIFICATION = "NEEDS_CLARIFICATION"
    CONFIRMED = "CONFIRMED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    SUPERSEDED = "SUPERSEDED"


class RequirementSourceType(str, enum.Enum):
    BRIEF = "BRIEF"
    DISCOVERY_QUESTION = "DISCOVERY_QUESTION"
    CLIENT_ANSWER = "CLIENT_ANSWER"
    MEETING = "MEETING"
    MANUAL_PM = "MANUAL_PM"


class DecisionStatus(str, enum.Enum):
    PROPOSED = "PROPOSED"
    ACCEPTED = "ACCEPTED"
    SUPERSEDED = "SUPERSEDED"
    REVOKED = "REVOKED"


class ScopeType(str, enum.Enum):
    IN_SCOPE = "IN_SCOPE"
    OUT_OF_SCOPE = "OUT_OF_SCOPE"
    UNDECIDED = "UNDECIDED"


class ScopeChangeStatus(str, enum.Enum):
    IDENTIFIED = "IDENTIFIED"
    UNDER_EVALUATION = "UNDER_EVALUATION"
    SUBMITTED = "SUBMITTED"
    CLIENT_APPROVED = "CLIENT_APPROVED"
    REJECTED = "REJECTED"
    IMPLEMENTED = "IMPLEMENTED"
    CANCELLED = "CANCELLED"


# --- Requirement Model ---
class Requirement(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "requirements"

    project_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False
    )
    key: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    
    category: Mapped[DiscoveryCategory] = mapped_column(
        Enum(DiscoveryCategory, name="discovery_category", create_type=False),
        default=DiscoveryCategory.FUNCTIONAL,
        nullable=False,
        index=True,
    )
    priority: Mapped[str] = mapped_column(String(50), default="MEDIUM", nullable=False)
    status: Mapped[RequirementStatus] = mapped_column(
        Enum(RequirementStatus, name="requirement_status"),
        default=RequirementStatus.DRAFT,
        nullable=False,
        index=True,
    )

    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    superseded_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("requirements.id", ondelete="SET NULL"), nullable=True, index=True
    )
    supersedes_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("requirements.id", ondelete="SET NULL"), nullable=True, index=True
    )

    source_type: Mapped[RequirementSourceType] = mapped_column(
        Enum(RequirementSourceType, name="requirement_source_type"),
        default=RequirementSourceType.MANUAL_PM,
        nullable=False,
    )
    source_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid(as_uuid=True), nullable=True)
    acceptance_criteria: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    rationale: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    project: Mapped["Project"] = relationship("Project")


# --- Decision Model ---
class Decision(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "decisions"

    project_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False
    )
    key: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    context: Mapped[str] = mapped_column(Text, nullable=False)
    decision: Mapped[str] = mapped_column(Text, nullable=False)
    rationale: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    implications: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[DecisionStatus] = mapped_column(
        Enum(DecisionStatus, name="decision_status"),
        default=DecisionStatus.ACCEPTED,
        nullable=False,
        index=True,
    )
    superseded_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("decisions.id", ondelete="SET NULL"), nullable=True
    )
    decided_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    decided_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )

    # Relationships
    project: Mapped["Project"] = relationship("Project")


# --- Scope Item Model ---
class ScopeItem(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "scope_items"

    project_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False
    )
    requirement_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("requirements.id", ondelete="SET NULL"), nullable=True, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    scope_type: Mapped[ScopeType] = mapped_column(
        Enum(ScopeType, name="scope_type"),
        default=ScopeType.IN_SCOPE,
        nullable=False,
        index=True,
    )
    rationale: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    project: Mapped["Project"] = relationship("Project")
    requirement: Mapped[Optional["Requirement"]] = relationship("Requirement")


# --- Scope Change Model ---
class ScopeChange(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "scope_changes"

    project_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False
    )
    key: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    impact_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[ScopeChangeStatus] = mapped_column(
        Enum(ScopeChangeStatus, name="scope_change_status"),
        default=ScopeChangeStatus.IDENTIFIED,
        nullable=False,
        index=True,
    )
    requested_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    approved_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    project: Mapped["Project"] = relationship("Project")
