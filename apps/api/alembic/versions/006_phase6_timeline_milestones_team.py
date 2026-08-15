"""006_phase6_timeline_milestones_team

Revision ID: 006_phase6_timeline_milestones_team
Revises: 005_phase5_planning_tasks_kanban
Create Date: 2026-08-15 21:40:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "006_phase6_timeline_milestones_team"
down_revision: Union[str, None] = "005_phase5_planning_tasks_kanban"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Project Members table
    op.create_table(
        "project_members",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("project_id", sa.Uuid(), sa.ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL"), index=True, nullable=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("role", sa.String(100), nullable=False, server_default="TEAM_MEMBER"),
        sa.Column("capacity_hours_per_week", sa.Float(), nullable=True, server_default="40.0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # 2. Milestones table
    op.create_table(
        "milestones",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("project_id", sa.Uuid(), sa.ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False),
        sa.Column("key", sa.String(50), index=True, nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("target_date", sa.Date(), nullable=False),
        sa.Column("actual_date", sa.Date(), nullable=True),
        sa.Column(
            "status",
            sa.Enum("PLANNED", "ACHIEVED", "MISSED", "CANCELLED", name="milestone_status"),
            nullable=False,
            server_default="PLANNED",
            index=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # 3. Add columns to tasks table
    op.add_column("tasks", sa.Column("start_date", sa.Date(), nullable=True))
    op.add_column("tasks", sa.Column("milestone_id", sa.Uuid(), sa.ForeignKey("milestones.id", ondelete="SET NULL"), nullable=True))
    op.add_column("tasks", sa.Column("assignee_id", sa.Uuid(), sa.ForeignKey("project_members.id", ondelete="SET NULL"), nullable=True))
    op.create_index("ix_tasks_milestone_id", "tasks", ["milestone_id"])
    op.create_index("ix_tasks_assignee_id", "tasks", ["assignee_id"])

    # 4. Task Dependencies table
    op.create_table(
        "task_dependencies",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("project_id", sa.Uuid(), sa.ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False),
        sa.Column("predecessor_task_id", sa.Uuid(), sa.ForeignKey("tasks.id", ondelete="CASCADE"), index=True, nullable=False),
        sa.Column("successor_task_id", sa.Uuid(), sa.ForeignKey("tasks.id", ondelete="CASCADE"), index=True, nullable=False),
        sa.Column("dependency_type", sa.String(50), nullable=False, server_default="FINISH_TO_START"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("task_dependencies")
    op.drop_index("ix_tasks_assignee_id", "tasks")
    op.drop_index("ix_tasks_milestone_id", "tasks")
    op.drop_column("tasks", "assignee_id")
    op.drop_column("tasks", "milestone_id")
    op.drop_column("tasks", "start_date")
    op.drop_table("milestones")
    op.drop_table("project_members")
    op.execute("DROP TYPE IF EXISTS milestone_status")
