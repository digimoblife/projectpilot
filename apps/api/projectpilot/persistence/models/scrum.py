import uuid
from typing import List, Optional
from datetime import date
from sqlalchemy import Date, ForeignKey, Integer, String, Text, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from projectpilot.persistence.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

class ScrumSession(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "scrum_sessions"

    project_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    session_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    week_number: Mapped[int] = mapped_column(Integer, nullable=False)
    week_year: Mapped[int] = mapped_column(Integer, nullable=False)
    facilitator_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    entries: Mapped[List["ScrumEntry"]] = relationship(
        "ScrumEntry", back_populates="session", cascade="all, delete-orphan"
    )

    __table_args__ = (UniqueConstraint("project_id", "session_date", name="uq_scrum_session_project_date"),)


class ScrumEntry(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "scrum_entries"

    session_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("scrum_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    member_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("project_members.id", ondelete="SET NULL"), nullable=True, index=True
    )
    member_name: Mapped[str] = mapped_column(String(255), nullable=False)
    what_done: Mapped[str] = mapped_column(Text, nullable=False)
    issues: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    what_next: Mapped[str] = mapped_column(Text, nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    session: Mapped["ScrumSession"] = relationship("ScrumSession", back_populates="entries")


class ScrumWeeklyReport(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "scrum_weekly_reports"

    project_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    week_number: Mapped[int] = mapped_column(Integer, nullable=False)
    week_year: Mapped[int] = mapped_column(Integer, nullable=False)
    generated_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    session_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    ai_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    report_markdown: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    __table_args__ = (UniqueConstraint("project_id", "week_year", "week_number", name="uq_scrum_report_project_week"),)
