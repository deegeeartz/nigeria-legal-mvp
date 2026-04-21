"""Add bar_chapter to lawyers

Revision ID: 20260421_0003
Revises: 97fea308cce6
Create Date: 2026-04-21
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "20260421_0003"
down_revision = "97fea308cce6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("lawyers", sa.Column("bar_chapter", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("lawyers", "bar_chapter")
