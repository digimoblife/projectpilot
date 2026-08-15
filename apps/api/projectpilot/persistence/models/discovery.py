import enum
import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from projectpilot.persistence.base import Base, TimestampMixin, UUIDPrimaryKeyMixin, utc_now


class DiscoveryCategory(str, enum.Enum):
    BUSINESS = "BUSINESS"
    FUNCTIONAL = "FUNCTIONAL"
    NON_FUNCTIONAL = "NON_FUNCTIONAL"
    TECHNICAL = "TECHNICAL"
    UX = "UX"
    DATA = "DATA"
    INTEGRATION = "INTEGRATION"
    SECURITY = "SECURITY"
    PERMISSION = "PERMISSION"
    REPORTING = "REPORTING"
    DEPLOYMENT = "DEPLOYMENT"
    MAINTENANCE = "MAINTENANCE"
    OPERATIONAL = "OPERATIONAL"


class DiscoveryQuestionStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    READY = "READY"
    SENT = "SENT"
    ANSWERED = "ANSWERED"
    NEEDS_FOLLOW_UP = "NEEDS_FOLLOW_UP"
    CLOSED = "CLOSED"


class Brief(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "briefs"

    project_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), unique=True, index=True, nullable=False
    )
    objective: Mapped[str] = mapped_column(Text, nullable=False)
    business_context: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    intended_users: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    expected_functionality: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    constraints: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    known_integrations: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    raw_content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    project: Mapped["Project"] = relationship("Project")


class DiscoveryQuestion(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "discovery_questions"

    project_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False
    )
    parent_question_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("discovery_questions.id", ondelete="SET NULL"), nullable=True, index=True
    )

    category: Mapped[DiscoveryCategory] = mapped_column(
        Enum(DiscoveryCategory, name="discovery_category"),
        default=DiscoveryCategory.FUNCTIONAL,
        nullable=False,
        index=True,
    )
    question: Mapped[str] = mapped_column(Text, nullable=False)
    rationale: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[DiscoveryQuestionStatus] = mapped_column(
        Enum(DiscoveryQuestionStatus, name="discovery_question_status"),
        default=DiscoveryQuestionStatus.DRAFT,
        nullable=False,
        index=True,
    )
    priority: Mapped[Optional[str]] = mapped_column(String(50), default="MEDIUM", nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    project: Mapped["Project"] = relationship("Project")
    answers: Mapped[List["ClientAnswer"]] = relationship(
        "ClientAnswer", back_populates="question", cascade="all, delete-orphan", order_by="asc(ClientAnswer.created_at)"
    )
    follow_ups: Mapped[List["DiscoveryQuestion"]] = relationship(
        "DiscoveryQuestion", backref=None, cascade="all"
    )


class ClientAnswer(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "client_answers"

    question_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("discovery_questions.id", ondelete="CASCADE"), index=True, nullable=False
    )
    answer_text: Mapped[str] = mapped_column(Text, nullable=False)
    respondent_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    respondent_role: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    source: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    answered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )

    # Relationships
    question: Mapped["DiscoveryQuestion"] = relationship("DiscoveryQuestion", back_populates="answers")
