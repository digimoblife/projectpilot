"""012_phase14_handover_completion

Revision ID: 012_phase14_handover_completion
Revises: 011_phase13_generated_documents
Create Date: 2026-08-15 22:20:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "012_phase14_handover_completion"
down_revision: Union[str, None] = "011_phase13_generated_documents"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Handovers Table
    op.create_table(
        "handovers",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("project_id", sa.Uuid(), sa.ForeignKey("projects.id", ondelete="CASCADE"), unique=True, index=True, nullable=False),
        sa.Column(
            "status",
            sa.Enum("NOT_STARTED", "IN_PREPARATION", "READY_FOR_REVIEW", "AWAITING_CLIENT_ACCEPTANCE", "COMPLETED", "BLOCKED", "CANCELLED", name="handover_status"),
            nullable=False,
            server_default="NOT_STARTED",
            index=True,
        ),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ready_for_review_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # 2. Handover Items Table
    op.create_table(
        "handover_items",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("handover_id", sa.Uuid(), sa.ForeignKey("handovers.id", ondelete="CASCADE"), index=True, nullable=False),
        sa.Column(
            "item_type",
            sa.Enum(
                "PRODUCTION_DEPLOYMENT",
                "UAT_APPROVAL",
                "CLIENT_ACCEPTANCE",
                "SOURCE_CODE",
                "CREDENTIALS",
                "FSD",
                "USER_GUIDE",
                "ADMIN_GUIDE",
                "TECHNICAL_DOCUMENTATION",
                "BACKUP_RECOVERY",
                "TRAINING",
                "SUPPORT_INFORMATION",
                "CUSTOM",
                name="handover_item_type",
            ),
            nullable=False,
            server_default="CUSTOM",
            index=True,
        ),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("required", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column(
            "status",
            sa.Enum("PENDING", "IN_PROGRESS", "COMPLETED", "WAIVED", "NOT_APPLICABLE", "BLOCKED", name="handover_item_status"),
            nullable=False,
            server_default="PENDING",
            index=True,
        ),
        sa.Column("related_document_id", sa.Uuid(), sa.ForeignKey("generated_documents.id", ondelete="SET NULL"), nullable=True),
        sa.Column("waiver_reason", sa.Text(), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_by_user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("handover_items")
    op.drop_table("handovers")
    op.execute("DROP TYPE IF EXISTS handover_item_status")
    op.execute("DROP TYPE IF EXISTS handover_item_type")
    op.execute("DROP TYPE IF EXISTS handover_status")
