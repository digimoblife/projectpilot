import enum
import uuid
from datetime import date
from typing import List, Optional
from sqlalchemy import Date, Enum, ForeignKey, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from projectpilot.persistence.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class ProjectLifecycleStage(str, enum.Enum):
    DISCOVERY = "DISCOVERY"
    REQUIREMENT_DEFINITION = "REQUIREMENT_DEFINITION"
    PLANNING = "PLANNING"
    AWAITING_CLIENT_APPROVAL = "AWAITING_CLIENT_APPROVAL"
    ACTIVE_DELIVERY = "ACTIVE_DELIVERY"
    HANDOVER = "HANDOVER"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    ON_HOLD = "ON_HOLD"


class ProjectHealth(str, enum.Enum):
    HEALTHY = "HEALTHY"
    WATCH = "WATCH"
    AT_RISK = "AT_RISK"
    CRITICAL = "CRITICAL"


class Project(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "projects"

    code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    client_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("clients.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )

    lifecycle_stage: Mapped[ProjectLifecycleStage] = mapped_column(
        Enum(ProjectLifecycleStage, name="project_lifecycle_stage"),
        default=ProjectLifecycleStage.DISCOVERY,
        nullable=False,
        index=True,
    )
    health: Mapped[ProjectHealth] = mapped_column(
        Enum(ProjectHealth, name="project_health"),
        default=ProjectHealth.HEALTHY,
        nullable=False,
    )

    start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    target_completion_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    actual_completion_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    # Relationships
    client: Mapped["Client"] = relationship("Client", back_populates="projects")
    owner: Mapped["User"] = relationship("User", foreign_keys=[owner_id])
    handover: Mapped[Optional["Handover"]] = relationship("Handover", back_populates="project", uselist=False, cascade="all, delete-orphan")
    activities: Mapped[List["ActivityEvent"]] = relationship(
        "ActivityEvent", back_populates="project", cascade="all, delete-orphan", order_by="desc(ActivityEvent.created_at)"
    )
