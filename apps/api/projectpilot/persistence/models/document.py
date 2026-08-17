import enum
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy import DateTime, Enum, ForeignKey, Integer, JSON, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from projectpilot.persistence.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class DocumentType(str, enum.Enum):
    PRD = "PRD"
    FSD = "FSD"
    USER_GUIDE = "USER_GUIDE"
    ADMIN_GUIDE = "ADMIN_GUIDE"
    TECHNICAL_DOCUMENTATION = "TECHNICAL_DOCUMENTATION"
    USER_DOCUMENTATION = "USER_DOCUMENTATION"
    DESIGN_DOCUMENTATION = "DESIGN_DOCUMENTATION"


class DocumentStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    UNDER_REVIEW = "UNDER_REVIEW"
    FINAL = "FINAL"
    SUPERSEDED = "SUPERSEDED"


class GeneratedDocument(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "generated_documents"

    project_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False
    )
    document_key: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    document_type: Mapped[DocumentType] = mapped_column(
        Enum(DocumentType, name="document_type"),
        default=DocumentType.FSD,
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[DocumentStatus] = mapped_column(
        Enum(DocumentStatus, name="document_status"),
        default=DocumentStatus.DRAFT,
        nullable=False,
        index=True,
    )
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_by_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    finalized_by_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    finalized_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    supersedes_document_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("generated_documents.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # Relationships
    project: Mapped["Project"] = relationship("Project")
    created_by: Mapped[Optional["User"]] = relationship("User", foreign_keys=[created_by_user_id])
    finalized_by: Mapped[Optional["User"]] = relationship("User", foreign_keys=[finalized_by_user_id])
    evidences: Mapped[List["DocumentEvidence"]] = relationship(
        "DocumentEvidence", back_populates="document", cascade="all, delete-orphan"
    )


class DocumentEvidence(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "document_evidences"

    generated_document_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("generated_documents.id", ondelete="CASCADE"), index=True, nullable=False
    )
    evidence_type: Mapped[str] = mapped_column(String(50), nullable=False)
    evidence_entity_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid(as_uuid=True), nullable=True, index=True)
    evidence_snapshot: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)

    # Relationships
    document: Mapped["GeneratedDocument"] = relationship("GeneratedDocument", back_populates="evidences")
