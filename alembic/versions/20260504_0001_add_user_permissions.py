"""Add user permissions

Revision ID: 20260504_0001
Revises: 20260424_0001
Create Date: 2026-05-04
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "20260504_0001"
down_revision = "20260424_0001"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("permissions", JSONB, server_default='[]', nullable=False)
    )

def downgrade() -> None:
    op.drop_column("users", "permissions")
