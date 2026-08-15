"""008_phase8_ai_core_infrastructure

Revision ID: 008_phase8_ai_core_infrastructure
Revises: 007_phase7_issues_risks_blockers_dependencies
Create Date: 2026-08-15 21:46:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "008_phase8_ai_core_infrastructure"
down_revision: Union[str, None] = "007_phase7_issues_risks_blockers_dependencies"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. AI Jobs table (durable queue)
    op.create_table(
        "ai_jobs",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("project_id", sa.Uuid(), sa.ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=True),
        sa.Column("job_type", sa.String(100), index=True, nullable=False),
        sa.Column(
            "status",
            sa.Enum("PENDING", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED", name="ai_job_status"),
            nullable=False,
            server_default="PENDING",
            index=True,
        ),
        sa.Column("payload", sa.JSON().with_variant(JSONB, "postgresql"), nullable=False),
        sa.Column("result", sa.JSON().with_variant(JSONB, "postgresql"), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("retry_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("max_retries", sa.Integer(), nullable=False, server_default="3"),
        sa.Column("claimed_by", sa.String(100), nullable=True),
        sa.Column("claimed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # 2. AI Suggestions table (human approval gate)
    op.create_table(
        "ai_suggestions",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("project_id", sa.Uuid(), sa.ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False),
        sa.Column("job_id", sa.Uuid(), sa.ForeignKey("ai_jobs.id", ondelete="SET NULL"), index=True, nullable=True),
        sa.Column("capability", sa.String(100), index=True, nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("suggested_data", sa.JSON().with_variant(JSONB, "postgresql"), nullable=False),
        sa.Column("evidence_sources", sa.JSON().with_variant(JSONB, "postgresql"), nullable=True),
        sa.Column(
            "status",
            sa.Enum("GENERATED", "ACCEPTED", "EDITED", "REJECTED", name="ai_suggestion_status"),
            nullable=False,
            server_default="GENERATED",
            index=True,
        ),
        sa.Column("reviewed_by_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL"), index=True, nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("review_notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("ai_suggestions")
    op.drop_table("ai_jobs")
    op.execute("DROP TYPE IF EXISTS ai_suggestion_status")
    op.execute("DROP TYPE IF EXISTS ai_job_status")
