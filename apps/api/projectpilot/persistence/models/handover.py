import enum
import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from projectpilot.persistence.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class HandoverStatus(str, enum.Enum):
    NOT_STARTED = "NOT_STARTED"
    IN_PREPARATION = "IN_PREPARATION"
    READY_FOR_REVIEW = "READY_FOR_REVIEW"
    AWAITING_CLIENT_ACCEPTANCE = "AWAITING_CLIENT_ACCEPTANCE"
    COMPLETED = "COMPLETED"
    BLOCKED = "BLOCKED"
    CANCELLED = "CANCELLED"


class HandoverItemStatus(str, enum.Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    WAIVED = "WAIVED"
    NOT_APPLICABLE = "NOT_APPLICABLE"
    BLOCKED = "BLOCKED"


class HandoverItemType(str, enum.Enum):
    PRODUCTION_DEPLOYMENT = "PRODUCTION_DEPLOYMENT"
    UAT_APPROVAL = "UAT_APPROVAL"
    CLIENT_ACCEPTANCE = "CLIENT_ACCEPTANCE"
    SOURCE_CODE = "SOURCE_CODE"
    CREDENTIALS = "CREDENTIALS"
    FSD = "FSD"
    USER_GUIDE = "USER_GUIDE"
    ADMIN_GUIDE = "ADMIN_GUIDE"
    TECHNICAL_DOCUMENTATION = "TECHNICAL_DOCUMENTATION"
    BACKUP_RECOVERY = "BACKUP_RECOVERY"
    TRAINING = "TRAINING"
    SUPPORT_INFORMATION = "SUPPORT_INFORMATION"
    CUSTOM = "CUSTOM"


class Handover(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "handovers"

    project_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), unique=True, index=True, nullable=False
    )
    status: Mapped[HandoverStatus] = mapped_column(
        Enum(HandoverStatus, name="handover_status"),
        default=HandoverStatus.NOT_STARTED,
        nullable=False,
        index=True,
    )
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    ready_for_review_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    submitted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="handover")
    items: Mapped[List["HandoverItem"]] = relationship(
        "HandoverItem", back_populates="handover", cascade="all, delete-orphan", order_by="HandoverItem.sort_order"
    )


class HandoverItem(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "handover_items"

    handover_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("handovers.id", ondelete="CASCADE"), index=True, nullable=False
    )
    item_type: Mapped[HandoverItemType] = mapped_column(
        Enum(HandoverItemType, name="handover_item_type"),
        default=HandoverItemType.CUSTOM,
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    required: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    status: Mapped[HandoverItemStatus] = mapped_column(
        Enum(HandoverItemStatus, name="handover_item_status"),
        default=HandoverItemStatus.PENDING,
        nullable=False,
        index=True,
    )
    related_document_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("generated_documents.id", ondelete="SET NULL"), nullable=True
    )
    waiver_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_by_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    handover: Mapped["Handover"] = relationship("Handover", back_populates="items")
    completed_by: Mapped[Optional["User"]] = relationship("User")
    related_document: Mapped[Optional["GeneratedDocument"]] = relationship("GeneratedDocument")
