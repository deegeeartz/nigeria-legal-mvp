"""Add compliance tables for consent and DSR workflows

Revision ID: 20260420_0002
Revises: 20260420_0001
Create Date: 2026-04-20
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "20260420_0002"
down_revision = "20260420_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "consent_events",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("purpose", sa.Text(), nullable=False),
        sa.Column("lawful_basis", sa.Text(), nullable=False),
        sa.Column("consented", sa.Boolean(), nullable=False),
        sa.Column("policy_version", sa.Text(), nullable=False),
        sa.Column("metadata_json", sa.Text(), nullable=True),
        sa.Column("created_on", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
    )
    op.create_index("ix_consent_events_user_id", "consent_events", ["user_id"])

    op.create_table(
        "dsr_requests",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("request_type", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("detail", sa.Text(), nullable=False),
        sa.Column("created_on", sa.Text(), nullable=False),
        sa.Column("updated_on", sa.Text(), nullable=False),
        sa.Column("resolved_on", sa.Text(), nullable=True),
        sa.Column("resolution_note", sa.Text(), nullable=True),
        sa.Column("resolved_by_user_id", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["resolved_by_user_id"], ["users.id"]),
    )
    op.create_index("ix_dsr_requests_user_id", "dsr_requests", ["user_id"])
    op.create_index("ix_dsr_requests_status", "dsr_requests", ["status"])


def downgrade() -> None:
    op.drop_index("ix_dsr_requests_status", table_name="dsr_requests")
    op.drop_index("ix_dsr_requests_user_id", table_name="dsr_requests")
    op.drop_table("dsr_requests")

    op.drop_index("ix_consent_events_user_id", table_name="consent_events")
    op.drop_table("consent_events")
