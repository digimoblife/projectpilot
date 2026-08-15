"""003_phase3_discovery_foundation

Revision ID: 003_phase3_discovery_foundation
Revises: 002_phase2_lead_management
Create Date: 2026-08-15 21:32:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "003_phase3_discovery_foundation"
down_revision: Union[str, None] = "002_phase2_lead_management"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Briefs table
    op.create_table(
        "briefs",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("project_id", sa.Uuid(), sa.ForeignKey("projects.id", ondelete="CASCADE"), unique=True, index=True, nullable=False),
        sa.Column("objective", sa.Text(), nullable=False),
        sa.Column("business_context", sa.Text(), nullable=True),
        sa.Column("intended_users", sa.Text(), nullable=True),
        sa.Column("expected_functionality", sa.Text(), nullable=True),
        sa.Column("constraints", sa.Text(), nullable=True),
        sa.Column("known_integrations", sa.Text(), nullable=True),
        sa.Column("raw_content", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # 2. Discovery Questions table
    op.create_table(
        "discovery_questions",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("project_id", sa.Uuid(), sa.ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False),
        sa.Column("parent_question_id", sa.Uuid(), sa.ForeignKey("discovery_questions.id", ondelete="SET NULL"), index=True, nullable=True),
        sa.Column(
            "category",
            sa.Enum(
                "BUSINESS",
                "FUNCTIONAL",
                "NON_FUNCTIONAL",
                "TECHNICAL",
                "UX",
                "DATA",
                "INTEGRATION",
                "SECURITY",
                "PERMISSION",
                "REPORTING",
                "DEPLOYMENT",
                "MAINTENANCE",
                "OPERATIONAL",
                name="discovery_category",
            ),
            nullable=False,
            server_default="FUNCTIONAL",
            index=True,
        ),
        sa.Column("question", sa.Text(), nullable=False),
        sa.Column("rationale", sa.Text(), nullable=True),
        sa.Column(
            "status",
            sa.Enum(
                "DRAFT",
                "READY",
                "SENT",
                "ANSWERED",
                "NEEDS_FOLLOW_UP",
                "CLOSED",
                name="discovery_question_status",
            ),
            nullable=False,
            server_default="DRAFT",
            index=True,
        ),
        sa.Column("priority", sa.String(50), nullable=True, server_default="MEDIUM"),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # 3. Client Answers table
    op.create_table(
        "client_answers",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("question_id", sa.Uuid(), sa.ForeignKey("discovery_questions.id", ondelete="CASCADE"), index=True, nullable=False),
        sa.Column("answer_text", sa.Text(), nullable=False),
        sa.Column("respondent_name", sa.String(255), nullable=True),
        sa.Column("respondent_role", sa.String(100), nullable=True),
        sa.Column("source", sa.String(100), nullable=True),
        sa.Column("answered_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("client_answers")
    op.drop_table("discovery_questions")
    op.drop_table("briefs")
    op.execute("DROP TYPE IF EXISTS discovery_question_status")
    op.execute("DROP TYPE IF EXISTS discovery_category")
