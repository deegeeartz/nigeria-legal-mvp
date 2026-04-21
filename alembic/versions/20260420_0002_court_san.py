"""Add court_admissions, legal_system, is_san columns to lawyers.

Revision ID: 20260420_0006
Revises: 20260420_0005
Create Date: 2026-04-20
"""
from alembic import op
import sqlalchemy as sa


revision = "20260420_0006"
down_revision = "20260420_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("lawyers", sa.Column("is_san", sa.Boolean(), server_default="false", nullable=False))
    op.add_column("lawyers", sa.Column("court_admissions", sa.Text(), server_default="", nullable=False))
    op.add_column("lawyers", sa.Column("legal_system", sa.Text(), server_default="common_law", nullable=False))


def downgrade() -> None:
    op.drop_column("lawyers", "legal_system")
    op.drop_column("lawyers", "court_admissions")
    op.drop_column("lawyers", "is_san")
