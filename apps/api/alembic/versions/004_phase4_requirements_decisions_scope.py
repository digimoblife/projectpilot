"""004_phase4_requirements_decisions_scope

Revision ID: 004_phase4_requirements_decisions_scope
Revises: 003_phase3_discovery_foundation
Create Date: 2026-08-15 21:34:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "004_phase4_requirements_decisions_scope"
down_revision: Union[str, None] = "003_phase3_discovery_foundation"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Requirements table
    op.create_table(
        "requirements",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("project_id", sa.Uuid(), sa.ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False),
        sa.Column("key", sa.String(50), index=True, nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
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
                create_type=False,
            ),
            nullable=False,
            index=True,
        ),
        sa.Column("priority", sa.String(50), nullable=False, server_default="MEDIUM"),
        sa.Column(
            "status",
            sa.Enum(
                "DRAFT",
                "NEEDS_CLARIFICATION",
                "CONFIRMED",
                "APPROVED",
                "REJECTED",
                "SUPERSEDED",
                name="requirement_status",
            ),
            nullable=False,
            server_default="DRAFT",
            index=True,
        ),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("superseded_by_id", sa.Uuid(), sa.ForeignKey("requirements.id", ondelete="SET NULL"), index=True, nullable=True),
        sa.Column("supersedes_id", sa.Uuid(), sa.ForeignKey("requirements.id", ondelete="SET NULL"), index=True, nullable=True),
        sa.Column(
            "source_type",
            sa.Enum(
                "BRIEF",
                "DISCOVERY_QUESTION",
                "CLIENT_ANSWER",
                "MEETING",
                "MANUAL_PM",
                name="requirement_source_type",
            ),
            nullable=False,
            server_default="MANUAL_PM",
        ),
        sa.Column("source_id", sa.Uuid(), nullable=True),
        sa.Column("acceptance_criteria", sa.Text(), nullable=True),
        sa.Column("rationale", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # 2. Decisions table
    op.create_table(
        "decisions",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("project_id", sa.Uuid(), sa.ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False),
        sa.Column("key", sa.String(50), index=True, nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("context", sa.Text(), nullable=False),
        sa.Column("decision", sa.Text(), nullable=False),
        sa.Column("rationale", sa.Text(), nullable=True),
        sa.Column("implications", sa.Text(), nullable=True),
        sa.Column(
            "status",
            sa.Enum(
                "PROPOSED",
                "ACCEPTED",
                "SUPERSEDED",
                "REVOKED",
                name="decision_status",
            ),
            nullable=False,
            server_default="ACCEPTED",
            index=True,
        ),
        sa.Column("superseded_by_id", sa.Uuid(), sa.ForeignKey("decisions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("decided_by", sa.String(255), nullable=True),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # 3. Scope Items table
    op.create_table(
        "scope_items",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("project_id", sa.Uuid(), sa.ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False),
        sa.Column("requirement_id", sa.Uuid(), sa.ForeignKey("requirements.id", ondelete="SET NULL"), index=True, nullable=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "scope_type",
            sa.Enum("IN_SCOPE", "OUT_OF_SCOPE", "UNDECIDED", name="scope_type"),
            nullable=False,
            server_default="IN_SCOPE",
            index=True,
        ),
        sa.Column("rationale", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # 4. Scope Changes table
    op.create_table(
        "scope_changes",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("project_id", sa.Uuid(), sa.ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False),
        sa.Column("key", sa.String(50), index=True, nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("impact_summary", sa.Text(), nullable=True),
        sa.Column(
            "status",
            sa.Enum(
                "IDENTIFIED",
                "UNDER_EVALUATION",
                "SUBMITTED",
                "CLIENT_APPROVED",
                "REJECTED",
                "IMPLEMENTED",
                "CANCELLED",
                name="scope_change_status",
            ),
            nullable=False,
            server_default="IDENTIFIED",
            index=True,
        ),
        sa.Column("requested_by", sa.String(255), nullable=True),
        sa.Column("approved_by", sa.String(255), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("scope_changes")
    op.drop_table("scope_items")
    op.drop_table("decisions")
    op.drop_table("requirements")
    op.execute("DROP TYPE IF EXISTS scope_change_status")
    op.execute("DROP TYPE IF EXISTS scope_type")
    op.execute("DROP TYPE IF EXISTS decision_status")
    op.execute("DROP TYPE IF EXISTS requirement_source_type")
    op.execute("DROP TYPE IF EXISTS requirement_status")
