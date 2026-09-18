"""018_client_dependency_provided_data

Revision ID: 018_client_dependency_provided_data
Revises: 017_project_resources
Create Date: 2026-09-18 14:02:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "018_client_dependency_provided_data"
down_revision: Union[str, None] = "017_project_resources"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("client_dependencies", sa.Column("provided_data", sa.Text(), nullable=True))
    op.add_column("client_dependencies", sa.Column("receipt_notes", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("client_dependencies", "receipt_notes")
    op.drop_column("client_dependencies", "provided_data")
