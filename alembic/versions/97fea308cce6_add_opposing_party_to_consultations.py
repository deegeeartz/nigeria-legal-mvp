"""add_opposing_party_to_consultations

Revision ID: 97fea308cce6
Revises: 20260421_0002
Create Date: 2026-04-21 14:03:49.897953
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '97fea308cce6'
down_revision = '20260421_0002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("consultations", sa.Column("opposing_party_name", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("consultations", "opposing_party_name")
