"""007_phase7_issues_risks_blockers_dependencies

Revision ID: 007_phase7_issues_risks_blockers_dependencies
Revises: 006_phase6_timeline_milestones_team
Create Date: 2026-08-15 21:42:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "007_phase7_issues_risks_blockers_dependencies"
down_revision: Union[str, None] = "006_phase6_timeline_milestones_team"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Risks table
    op.create_table(
        "risks",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("project_id", sa.Uuid(), sa.ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False),
        sa.Column("materialized_issue_id", sa.Uuid(), nullable=True),
        sa.Column("key", sa.String(50), index=True, nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("probability", sa.String(50), nullable=False, server_default="MEDIUM"),
        sa.Column("impact", sa.String(50), nullable=False, server_default="MEDIUM"),
        sa.Column("mitigation_plan", sa.Text(), nullable=True),
        sa.Column(
            "status",
            sa.Enum("IDENTIFIED", "MONITORED", "MATERIALIZED", "MITIGATED", "CLOSED", name="risk_status"),
            nullable=False,
            server_default="IDENTIFIED",
            index=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # 2. Issues table
    op.create_table(
        "issues",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("project_id", sa.Uuid(), sa.ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False),
        sa.Column("source_risk_id", sa.Uuid(), sa.ForeignKey("risks.id", ondelete="SET NULL"), index=True, nullable=True),
        sa.Column("key", sa.String(50), index=True, nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("severity", sa.String(50), nullable=False, server_default="MEDIUM"),
        sa.Column(
            "status",
            sa.Enum("OPEN", "IN_INVESTIGATION", "RESOLVED", "CLOSED", "WONT_FIX", name="issue_status"),
            nullable=False,
            server_default="OPEN",
            index=True,
        ),
        sa.Column("resolution_notes", sa.Text(), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # 3. Blockers table
    op.create_table(
        "blockers",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("project_id", sa.Uuid(), sa.ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False),
        sa.Column("task_id", sa.Uuid(), sa.ForeignKey("tasks.id", ondelete="SET NULL"), index=True, nullable=True),
        sa.Column("key", sa.String(50), index=True, nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("blocker_type", sa.String(50), nullable=False, server_default="TECHNICAL"),
        sa.Column(
            "status",
            sa.Enum("ACTIVE", "RESOLVED", "ESCALATED", name="blocker_status"),
            nullable=False,
            server_default="ACTIVE",
            index=True,
        ),
        sa.Column("resolution_notes", sa.Text(), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # 4. Client Dependencies table
    op.create_table(
        "client_dependencies",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("project_id", sa.Uuid(), sa.ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False),
        sa.Column("task_id", sa.Uuid(), sa.ForeignKey("tasks.id", ondelete="SET NULL"), index=True, nullable=True),
        sa.Column("milestone_id", sa.Uuid(), sa.ForeignKey("milestones.id", ondelete="SET NULL"), index=True, nullable=True),
        sa.Column("blocker_id", sa.Uuid(), sa.ForeignKey("blockers.id", ondelete="SET NULL"), index=True, nullable=True),
        sa.Column("key", sa.String(50), index=True, nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("dependency_type", sa.String(50), nullable=False, server_default="CREDENTIALS"),
        sa.Column(
            "status",
            sa.Enum("REQUESTED", "IN_PROGRESS", "PROVIDED", "OVERDUE", "CANCELLED", name="client_dependency_status"),
            nullable=False,
            server_default="REQUESTED",
            index=True,
        ),
        sa.Column("requested_date", sa.Date(), nullable=False),
        sa.Column("expected_date", sa.Date(), nullable=False),
        sa.Column("provided_date", sa.Date(), nullable=True),
        sa.Column("impact_summary", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("client_dependencies")
    op.drop_table("blockers")
    op.drop_table("issues")
    op.drop_table("risks")
    op.execute("DROP TYPE IF EXISTS client_dependency_status")
    op.execute("DROP TYPE IF EXISTS blocker_status")
    op.execute("DROP TYPE IF EXISTS issue_status")
    op.execute("DROP TYPE IF EXISTS risk_status")
