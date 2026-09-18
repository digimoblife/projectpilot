import enum
import uuid
from datetime import date, datetime
from typing import Optional
from sqlalchemy import BigInteger, Date, DateTime, Enum, ForeignKey, Index, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from projectpilot.persistence.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class ResourceType(str, enum.Enum):
    FILE = "FILE"
    LINK = "LINK"
    DELIVERABLE = "DELIVERABLE"


class ResourceStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    ARCHIVED = "ARCHIVED"


class DeliverableStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"


class ProjectResource(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "project_resources"

    project_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    resource_type: Mapped[ResourceType] = mapped_column(
        Enum(ResourceType, name="resource_type"),
        index=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[ResourceStatus] = mapped_column(
        Enum(ResourceStatus, name="resource_status"),
        default=ResourceStatus.ACTIVE,
        index=True,
        nullable=False,
    )

    # File Metadata
    file_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    file_size_bytes: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    mime_type: Mapped[Optional[str]] = mapped_column(String(127), nullable=True)
    storage_key: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    checksum_sha256: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    # Link Metadata
    url: Mapped[Optional[str]] = mapped_column(String(2048), nullable=True)
    link_category: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Deliverable Metadata
    deliverable_version: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    delivery_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    deliverable_status: Mapped[Optional[DeliverableStatus]] = mapped_column(
        Enum(DeliverableStatus, name="deliverable_status"),
        nullable=True,
    )
    related_resource_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("project_resources.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Audit & Lifecycle
    created_by_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    updated_by_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    archived_by_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    archived_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    project: Mapped["Project"] = relationship("Project")
    created_by: Mapped[Optional["User"]] = relationship("User", foreign_keys=[created_by_user_id])
    updated_by: Mapped[Optional["User"]] = relationship("User", foreign_keys=[updated_by_user_id])
    archived_by: Mapped[Optional["User"]] = relationship("User", foreign_keys=[archived_by_user_id])
    related_resource: Mapped[Optional["ProjectResource"]] = relationship(
        "ProjectResource",
        remote_side="[ProjectResource.id]",
        foreign_keys=[related_resource_id],
    )

    __table_args__ = (
        Index("ix_project_resources_proj_status", "project_id", "status"),
        Index("ix_project_resources_proj_type", "project_id", "resource_type"),
    )
