"""011_phase13_generated_documents

Revision ID: 011_phase13_generated_documents
Revises: 010_phase12_reports
Create Date: 2026-08-15 22:12:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "011_phase13_generated_documents"
down_revision: Union[str, None] = "010_phase12_reports"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Generated Documents Table
    op.create_table(
        "generated_documents",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("project_id", sa.Uuid(), sa.ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False),
        sa.Column("document_key", sa.String(50), index=True, nullable=False),
        sa.Column(
            "document_type",
            sa.Enum("FSD", "USER_GUIDE", "ADMIN_GUIDE", "TECHNICAL_DOCUMENTATION", "USER_DOCUMENTATION", "DESIGN_DOCUMENTATION", name="document_type"),
            nullable=False,
            server_default="FSD",
            index=True,
        ),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column(
            "status",
            sa.Enum("DRAFT", "UNDER_REVIEW", "FINAL", "SUPERSEDED", name="document_status"),
            nullable=False,
            server_default="DRAFT",
            index=True,
        ),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("created_by_user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL"), index=True, nullable=True),
        sa.Column("finalized_by_user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL"), index=True, nullable=True),
        sa.Column("finalized_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("supersedes_document_id", sa.Uuid(), sa.ForeignKey("generated_documents.id", ondelete="SET NULL"), index=True, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # 2. Document Evidences Table
    op.create_table(
        "document_evidences",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("generated_document_id", sa.Uuid(), sa.ForeignKey("generated_documents.id", ondelete="CASCADE"), index=True, nullable=False),
        sa.Column("evidence_type", sa.String(50), nullable=False),
        sa.Column("evidence_entity_id", sa.Uuid(), index=True, nullable=True),
        sa.Column("evidence_snapshot", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("document_evidences")
    op.drop_table("generated_documents")
    op.execute("DROP TYPE IF EXISTS document_status")
    op.execute("DROP TYPE IF EXISTS document_type")
