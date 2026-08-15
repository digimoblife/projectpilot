"""009_phase10_meetings_action_items

Revision ID: 009_phase10_meetings_action_items
Revises: 008_phase8_ai_core_infrastructure
Create Date: 2026-08-15 21:59:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "009_phase10_meetings_action_items"
down_revision: Union[str, None] = "008_phase8_ai_core_infrastructure"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Meetings Table
    op.create_table(
        "meetings",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("project_id", sa.Uuid(), sa.ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False),
        sa.Column("meeting_key", sa.String(50), index=True, nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column(
            "meeting_type",
            sa.Enum("KICKOFF", "DISCOVERY", "WEEKLY_SYNC", "SPRINT_PLANNING", "SPRINT_REVIEW", "AD_HOC", "CLIENT_REVIEW", "HANDOVER", name="meeting_type"),
            nullable=False,
            server_default="WEEKLY_SYNC",
            index=True,
        ),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now(), index=True),
        sa.Column(
            "status",
            sa.Enum("SCHEDULED", "COMPLETED", "CANCELLED", "FINALIZED", name="meeting_status"),
            nullable=False,
            server_default="COMPLETED",
            index=True,
        ),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("transcript", sa.Text(), nullable=True),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("created_by_user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL"), index=True, nullable=True),
        sa.Column("finalized_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # 2. Meeting Participants Table
    op.create_table(
        "meeting_participants",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("meeting_id", sa.Uuid(), sa.ForeignKey("meetings.id", ondelete="CASCADE"), index=True, nullable=False),
        sa.Column(
            "participant_type",
            sa.Enum("INTERNAL", "CLIENT", "EXTERNAL", name="participant_type"),
            nullable=False,
            server_default="INTERNAL",
        ),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL"), index=True, nullable=True),
        sa.Column("display_name_snapshot", sa.String(255), nullable=False),
        sa.Column("role_snapshot", sa.String(100), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # 3. Action Items Table
    op.create_table(
        "action_items",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("project_id", sa.Uuid(), sa.ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False),
        sa.Column("meeting_id", sa.Uuid(), sa.ForeignKey("meetings.id", ondelete="SET NULL"), index=True, nullable=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "status",
            sa.Enum("OPEN", "IN_PROGRESS", "DONE", "CANCELLED", "CONVERTED", name="action_item_status"),
            nullable=False,
            server_default="OPEN",
            index=True,
        ),
        sa.Column("owner_name", sa.String(255), nullable=True),
        sa.Column("owner_user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL"), index=True, nullable=True),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "converted_entity_type",
            sa.Enum("TASK", "CLIENT_DEPENDENCY", "ISSUE", name="converted_entity_type"),
            nullable=True,
        ),
        sa.Column("converted_entity_id", sa.Uuid(), index=True, nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("action_items")
    op.drop_table("meeting_participants")
    op.drop_table("meetings")
    op.execute("DROP TYPE IF EXISTS converted_entity_type")
    op.execute("DROP TYPE IF EXISTS action_item_status")
    op.execute("DROP TYPE IF EXISTS participant_type")
    op.execute("DROP TYPE IF EXISTS meeting_status")
    op.execute("DROP TYPE IF EXISTS meeting_type")
