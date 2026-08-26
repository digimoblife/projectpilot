import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy import DateTime, ForeignKey, JSON, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from projectpilot.persistence.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class MoMDocument(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "mom_documents"

    mom_key: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    meeting_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True
    )
    project_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    raw_text: Mapped[str] = mapped_column(Text, nullable=False)
    content_md: Mapped[str] = mapped_column(Text, nullable=False)
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    attendees: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)
    action_items: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSON, nullable=True)
    decisions: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)

    created_by_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # Relationships
    project: Mapped[Optional["Project"]] = relationship("Project")  # type: ignore # noqa: F821
    created_by: Mapped[Optional["User"]] = relationship("User", foreign_keys=[created_by_user_id])  # type: ignore # noqa: F821
