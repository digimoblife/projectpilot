"""017_project_resources

Revision ID: 017_project_resources
Revises: 016_shared_links
Create Date: 2026-09-18 11:30:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "017_project_resources"
down_revision: Union[str, None] = "016_shared_links"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enums
    resource_type_enum = sa.Enum("FILE", "LINK", "DELIVERABLE", name="resource_type")
    resource_status_enum = sa.Enum("ACTIVE", "ARCHIVED", name="resource_status")
    deliverable_status_enum = sa.Enum("DRAFT", "SUBMITTED", "ACCEPTED", "REJECTED", name="deliverable_status")

    op.create_table(
        "project_resources",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column("resource_type", resource_type_enum, nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", resource_status_enum, server_default="ACTIVE", nullable=False),
        # File metadata
        sa.Column("file_name", sa.String(length=255), nullable=True),
        sa.Column("file_size_bytes", sa.BigInteger(), nullable=True),
        sa.Column("mime_type", sa.String(length=127), nullable=True),
        sa.Column("storage_key", sa.String(length=512), nullable=True),
        sa.Column("checksum_sha256", sa.String(length=64), nullable=True),
        # Link metadata
        sa.Column("url", sa.String(length=2048), nullable=True),
        sa.Column("link_category", sa.String(length=50), nullable=True),
        # Deliverable metadata
        sa.Column("deliverable_version", sa.String(length=50), nullable=True),
        sa.Column("delivery_date", sa.Date(), nullable=True),
        sa.Column("deliverable_status", deliverable_status_enum, nullable=True),
        sa.Column("related_resource_id", sa.Uuid(), nullable=True),
        # Audit & Lifecycle
        sa.Column("created_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("updated_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("archived_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        # Constraints
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["related_resource_id"], ["project_resources.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["updated_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["archived_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_project_resources_id"), "project_resources", ["id"], unique=False)
    op.create_index(op.f("ix_project_resources_project_id"), "project_resources", ["project_id"], unique=False)
    op.create_index(op.f("ix_project_resources_resource_type"), "project_resources", ["resource_type"], unique=False)
    op.create_index(op.f("ix_project_resources_status"), "project_resources", ["status"], unique=False)
    op.create_index(op.f("ix_project_resources_related_resource_id"), "project_resources", ["related_resource_id"], unique=False)
    op.create_index(op.f("ix_project_resources_created_by_user_id"), "project_resources", ["created_by_user_id"], unique=False)
    op.create_index("ix_project_resources_proj_status", "project_resources", ["project_id", "status"], unique=False)
    op.create_index("ix_project_resources_proj_type", "project_resources", ["project_id", "resource_type"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_project_resources_proj_type", table_name="project_resources")
    op.drop_index("ix_project_resources_proj_status", table_name="project_resources")
    op.drop_index(op.f("ix_project_resources_created_by_user_id"), table_name="project_resources")
    op.drop_index(op.f("ix_project_resources_related_resource_id"), table_name="project_resources")
    op.drop_index(op.f("ix_project_resources_status"), table_name="project_resources")
    op.drop_index(op.f("ix_project_resources_resource_type"), table_name="project_resources")
    op.drop_index(op.f("ix_project_resources_project_id"), table_name="project_resources")
    op.drop_index(op.f("ix_project_resources_id"), table_name="project_resources")
    op.drop_table("project_resources")

    sa.Enum(name="deliverable_status").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="resource_status").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="resource_type").drop(op.get_bind(), checkfirst=True)
