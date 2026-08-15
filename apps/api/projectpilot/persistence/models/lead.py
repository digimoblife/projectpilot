import enum
import uuid
from typing import Optional
from sqlalchemy import Enum, ForeignKey, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from projectpilot.persistence.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class LeadStatus(str, enum.Enum):
    NEW = "NEW"
    CONTACTED = "CONTACTED"
    BRIEF_SCHEDULED = "BRIEF_SCHEDULED"
    QUALIFIED = "QUALIFIED"
    NOT_QUALIFIED = "NOT_QUALIFIED"
    CONVERTED = "CONVERTED"
    LOST = "LOST"


class Lead(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "leads"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    
    client_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("clients.id", ondelete="SET NULL"), nullable=True, index=True
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    converted_project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True
    )

    status: Mapped[LeadStatus] = mapped_column(
        Enum(LeadStatus, name="lead_status"),
        default=LeadStatus.NEW,
        nullable=False,
        index=True,
    )

    client_pic_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    client_pic_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    client_pic_phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    project_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    source: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    opportunity_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    estimated_budget_note: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    loss_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    brief_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    client: Mapped[Optional["Client"]] = relationship("Client")
    owner: Mapped["User"] = relationship("User")
    converted_project: Mapped[Optional["Project"]] = relationship("Project")
