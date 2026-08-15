"""005_phase5_planning_tasks_kanban

Revision ID: 005_phase5_planning_tasks_kanban
Revises: 004_phase4_requirements_decisions_scope
Create Date: 2026-08-15 21:37:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "005_phase5_planning_tasks_kanban"
down_revision: Union[str, None] = "004_phase4_requirements_decisions_scope"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Epics table
    op.create_table(
        "epics",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("project_id", sa.Uuid(), sa.ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False),
        sa.Column("key", sa.String(50), index=True, nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="PLANNED"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # 2. Features table
    op.create_table(
        "features",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("project_id", sa.Uuid(), sa.ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False),
        sa.Column("epic_id", sa.Uuid(), sa.ForeignKey("epics.id", ondelete="SET NULL"), index=True, nullable=True),
        sa.Column("requirement_id", sa.Uuid(), sa.ForeignKey("requirements.id", ondelete="SET NULL"), index=True, nullable=True),
        sa.Column("key", sa.String(50), index=True, nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="PLANNED"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # 3. Tasks table
    op.create_table(
        "tasks",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("project_id", sa.Uuid(), sa.ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False),
        sa.Column("epic_id", sa.Uuid(), sa.ForeignKey("epics.id", ondelete="SET NULL"), index=True, nullable=True),
        sa.Column("feature_id", sa.Uuid(), sa.ForeignKey("features.id", ondelete="SET NULL"), index=True, nullable=True),
        sa.Column("requirement_id", sa.Uuid(), sa.ForeignKey("requirements.id", ondelete="SET NULL"), index=True, nullable=True),
        sa.Column("scope_item_id", sa.Uuid(), sa.ForeignKey("scope_items.id", ondelete="SET NULL"), index=True, nullable=True),
        sa.Column("parent_task_id", sa.Uuid(), sa.ForeignKey("tasks.id", ondelete="SET NULL"), index=True, nullable=True),
        sa.Column("key", sa.String(50), index=True, nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "status",
            sa.Enum(
                "BACKLOG",
                "READY",
                "IN_PROGRESS",
                "IN_REVIEW",
                "QA",
                "BLOCKED",
                "DONE",
                "CANCELLED",
                name="task_status",
            ),
            nullable=False,
            server_default="BACKLOG",
            index=True,
        ),
        sa.Column("priority", sa.String(50), nullable=False, server_default="MEDIUM"),
        sa.Column("estimated_hours", sa.Float(), nullable=True),
        sa.Column("actual_hours", sa.Float(), nullable=True),
        sa.Column("assignee_name", sa.String(255), nullable=True),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("blocker_reason", sa.Text(), nullable=True),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("tasks")
    op.drop_table("features")
    op.drop_table("epics")
    op.execute("DROP TYPE IF EXISTS task_status")
