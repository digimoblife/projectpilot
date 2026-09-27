"""020_add_prd_to_document_type_enum

Revision ID: 020_add_prd_to_document_type_enum
Revises: 019_task_archive_support
Create Date: 2026-09-25 22:20:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "020_add_prd_to_document_type_enum"
down_revision: Union[str, None] = "019_task_archive_support"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Safely add 'PRD' to the PostgreSQL enum document_type if it doesn't exist
    op.execute("ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'PRD'")


def downgrade() -> None:
    # PostgreSQL does not support dropping a value from an enum type easily without rebuilding the type.
    pass
