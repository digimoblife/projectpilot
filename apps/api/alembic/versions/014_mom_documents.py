"""014_mom_documents

Revision ID: 014_mom_documents
Revises: 013_add_lead_client_references
Create Date: 2026-08-26 13:50:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "014_mom_documents"
down_revision: Union[str, None] = "013_add_lead_client_references"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "mom_documents",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("mom_key", sa.String(length=50), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("meeting_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("project_id", sa.Uuid(), nullable=True),
        sa.Column("raw_text", sa.Text(), nullable=False),
        sa.Column("content_md", sa.Text(), nullable=False),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("attendees", sa.JSON().with_variant(JSONB, "postgresql"), nullable=True),
        sa.Column("action_items", sa.JSON().with_variant(JSONB, "postgresql"), nullable=True),
        sa.Column("decisions", sa.JSON().with_variant(JSONB, "postgresql"), nullable=True),
        sa.Column("created_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_mom_documents_id"), "mom_documents", ["id"], unique=False)
    op.create_index(op.f("ix_mom_documents_mom_key"), "mom_documents", ["mom_key"], unique=False)
    op.create_index(op.f("ix_mom_documents_project_id"), "mom_documents", ["project_id"], unique=False)
    op.create_index(op.f("ix_mom_documents_created_by_user_id"), "mom_documents", ["created_by_user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_mom_documents_created_by_user_id"), table_name="mom_documents")
    op.drop_index(op.f("ix_mom_documents_project_id"), table_name="mom_documents")
    op.drop_index(op.f("ix_mom_documents_mom_key"), table_name="mom_documents")
    op.drop_index(op.f("ix_mom_documents_id"), table_name="mom_documents")
    op.drop_table("mom_documents")
