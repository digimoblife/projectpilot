"""002_phase2_lead_management

Revision ID: 002_phase2_lead_management
Revises: 001_phase1_initial_schema
Create Date: 2026-08-15 21:28:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "002_phase2_lead_management"
down_revision: Union[str, None] = "001_phase1_initial_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "leads",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("company_name", sa.String(255), nullable=False),
        sa.Column("client_id", sa.Uuid(), sa.ForeignKey("clients.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.Column("owner_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True),
        sa.Column("converted_project_id", sa.Uuid(), sa.ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.Column(
            "status",
            sa.Enum(
                "NEW",
                "CONTACTED",
                "BRIEF_SCHEDULED",
                "QUALIFIED",
                "NOT_QUALIFIED",
                "CONVERTED",
                "LOST",
                name="lead_status",
            ),
            nullable=False,
            server_default="NEW",
            index=True,
        ),
        sa.Column("client_pic_name", sa.String(255), nullable=True),
        sa.Column("client_pic_email", sa.String(255), nullable=True),
        sa.Column("client_pic_phone", sa.String(50), nullable=True),
        sa.Column("project_type", sa.String(100), nullable=True),
        sa.Column("source", sa.String(100), nullable=True),
        sa.Column("opportunity_description", sa.Text(), nullable=True),
        sa.Column("estimated_budget_note", sa.String(255), nullable=True),
        sa.Column("loss_reason", sa.Text(), nullable=True),
        sa.Column("brief_notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("leads")
    op.execute("DROP TYPE IF EXISTS lead_status")
