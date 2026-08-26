"""015_add_project_name_to_mom_documents

Revision ID: 015_add_project_name_to_mom_documents
Revises: 014_mom_documents
Create Date: 2026-08-26 14:05:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "015_add_project_name_to_mom_documents"
down_revision: Union[str, None] = "014_mom_documents"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("mom_documents", sa.Column("project_name", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("mom_documents", "project_name")
