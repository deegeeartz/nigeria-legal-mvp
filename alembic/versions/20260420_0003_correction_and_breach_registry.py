"""Add DSR correction workflow and breach incident registry

Revision ID: 20260420_0003
Revises: 20260420_0002
Create Date: 2026-04-20
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "20260420_0003"
down_revision = "20260420_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "dsr_corrections",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("dsr_request_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("field_name", sa.Text(), nullable=False),
        sa.Column("current_value", sa.Text(), nullable=True),
        sa.Column("requested_value", sa.Text(), nullable=False),
        sa.Column("justification", sa.Text(), nullable=False),
        sa.Column("evidence", sa.Text(), nullable=True),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("review_note", sa.Text(), nullable=True),
        sa.Column("reviewed_by_user_id", sa.Integer(), nullable=True),
        sa.Column("reviewed_on", sa.Text(), nullable=True),
        sa.Column("created_on", sa.Text(), nullable=False),
        sa.Column("updated_on", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(["dsr_request_id"], ["dsr_requests.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["reviewed_by_user_id"], ["users.id"]),
    )
    op.create_index("ix_dsr_corrections_user_id", "dsr_corrections", ["user_id"])
    op.create_index("ix_dsr_corrections_status", "dsr_corrections", ["status"])

    op.create_table(
        "breach_incidents",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("severity", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("impact_summary", sa.Text(), nullable=True),
        sa.Column("affected_data_types", sa.Text(), nullable=True),
        sa.Column("affected_records", sa.Integer(), nullable=True),
        sa.Column("occurred_on", sa.Text(), nullable=True),
        sa.Column("detected_on", sa.Text(), nullable=False),
        sa.Column("reported_to_ndpc", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("ndpc_reported_on", sa.Text(), nullable=True),
        sa.Column("contained_on", sa.Text(), nullable=True),
        sa.Column("resolved_on", sa.Text(), nullable=True),
        sa.Column("resolution_note", sa.Text(), nullable=True),
        sa.Column("created_by_user_id", sa.Integer(), nullable=False),
        sa.Column("updated_by_user_id", sa.Integer(), nullable=False),
        sa.Column("created_on", sa.Text(), nullable=False),
        sa.Column("updated_on", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["updated_by_user_id"], ["users.id"]),
    )
    op.create_index("ix_breach_incidents_status", "breach_incidents", ["status"])
    op.create_index("ix_breach_incidents_severity", "breach_incidents", ["severity"])


def downgrade() -> None:
    op.drop_index("ix_breach_incidents_severity", table_name="breach_incidents")
    op.drop_index("ix_breach_incidents_status", table_name="breach_incidents")
    op.drop_table("breach_incidents")

    op.drop_index("ix_dsr_corrections_status", table_name="dsr_corrections")
    op.drop_index("ix_dsr_corrections_user_id", table_name="dsr_corrections")
    op.drop_table("dsr_corrections")
