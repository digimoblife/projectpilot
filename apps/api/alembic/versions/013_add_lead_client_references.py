"""013_add_lead_client_references

Revision ID: 013_add_lead_client_references
Revises: 012_phase14_handover_completion
Create Date: 2026-08-16 15:00:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "013_add_lead_client_references"
down_revision: Union[str, None] = "012_phase14_handover_completion"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "leads",
        sa.Column(
            "client_references",
            sa.JSON().with_variant(JSONB, "postgresql"),
            nullable=True,
            server_default="[]",
        ),
    )


def downgrade() -> None:
    op.drop_column("leads", "client_references")
