"""016_shared_links

Revision ID: 016_shared_links
Revises: 015_add_project_name_to_mom_documents
Create Date: 2026-09-15 21:05:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "016_shared_links"
down_revision: Union[str, None] = "015_add_project_name_to_mom_documents"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "shared_links",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("token", sa.String(length=64), nullable=False),
        sa.Column("resource_type", sa.String(length=32), nullable=False),
        sa.Column("resource_id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("view_count", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("last_viewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_shared_links_id"), "shared_links", ["id"], unique=False)
    op.create_index(op.f("ix_shared_links_token"), "shared_links", ["token"], unique=True)
    op.create_index(op.f("ix_shared_links_resource_type"), "shared_links", ["resource_type"], unique=False)
    op.create_index(op.f("ix_shared_links_resource_id"), "shared_links", ["resource_id"], unique=False)
    op.create_index(op.f("ix_shared_links_created_by_user_id"), "shared_links", ["created_by_user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_shared_links_created_by_user_id"), table_name="shared_links")
    op.drop_index(op.f("ix_shared_links_resource_id"), table_name="shared_links")
    op.drop_index(op.f("ix_shared_links_resource_type"), table_name="shared_links")
    op.drop_index(op.f("ix_shared_links_token"), table_name="shared_links")
    op.drop_index(op.f("ix_shared_links_id"), table_name="shared_links")
    op.drop_table("shared_links")
