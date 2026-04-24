"""Add ADR consultation fields

Revision ID: 20260424_0001
Revises: 20260423_0001
Create Date: 2026-04-24
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "20260424_0001"
down_revision = "20260423_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "consultations",
        sa.Column("matter_type", sa.Text(), nullable=False, server_default="general"),
    )
    op.add_column(
        "consultations",
        sa.Column("adr_preferred", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )


def downgrade() -> None:
    op.drop_column("consultations", "adr_preferred")
    op.drop_column("consultations", "matter_type")
