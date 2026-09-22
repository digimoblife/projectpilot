"""019_task_archive_support

Revision ID: 019_task_archive_support
Revises: 018_client_dependency_provided_data
Create Date: 2026-09-22 22:35:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "019_task_archive_support"
down_revision: Union[str, None] = "018_client_dependency_provided_data"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("tasks", sa.Column("is_archived", sa.Boolean(), server_default=sa.text("false"), nullable=False))
    op.add_column("tasks", sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index(op.f("ix_tasks_is_archived"), "tasks", ["is_archived"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_tasks_is_archived"), table_name="tasks")
    op.drop_column("tasks", "archived_at")
    op.drop_column("tasks", "is_archived")
