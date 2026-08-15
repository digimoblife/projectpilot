"""010_phase12_reports

Revision ID: 010_phase12_reports
Revises: 009_phase10_meetings_action_items
Create Date: 2026-08-15 22:09:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "010_phase12_reports"
down_revision: Union[str, None] = "009_phase10_meetings_action_items"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Reports Table
    op.create_table(
        "reports",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("project_id", sa.Uuid(), sa.ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False),
        sa.Column("report_key", sa.String(50), index=True, nullable=False),
        sa.Column(
            "report_type",
            sa.Enum("WEEKLY_INTERNAL", "WEEKLY_CLIENT", "MONTHLY_INTERNAL", "MONTHLY_CLIENT", name="report_type"),
            nullable=False,
            server_default="WEEKLY_INTERNAL",
            index=True,
        ),
        sa.Column("reporting_period_start", sa.Date(), nullable=False),
        sa.Column("reporting_period_end", sa.Date(), nullable=False),
        sa.Column(
            "status",
            sa.Enum("DRAFT", "UNDER_REVIEW", "FINAL", "SUPERSEDED", name="report_status"),
            nullable=False,
            server_default="DRAFT",
            index=True,
        ),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("created_by_user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL"), index=True, nullable=True),
        sa.Column("finalized_by_user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL"), index=True, nullable=True),
        sa.Column("finalized_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("supersedes_report_id", sa.Uuid(), sa.ForeignKey("reports.id", ondelete="SET NULL"), index=True, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # 2. Report Evidences Table
    op.create_table(
        "report_evidences",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("report_id", sa.Uuid(), sa.ForeignKey("reports.id", ondelete="CASCADE"), index=True, nullable=False),
        sa.Column("evidence_type", sa.String(50), nullable=False),
        sa.Column("evidence_entity_id", sa.Uuid(), index=True, nullable=True),
        sa.Column("evidence_snapshot", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("report_evidences")
    op.drop_table("reports")
    op.execute("DROP TYPE IF EXISTS report_status")
    op.execute("DROP TYPE IF EXISTS report_type")
