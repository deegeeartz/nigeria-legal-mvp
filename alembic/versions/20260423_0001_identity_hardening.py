"""Identity Hardening: Phone, Profile Pics, and Universal NIN

Revision ID: 20260423_0001
Revises: 20260421_0005
Create Date: 2026-04-23
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "20260423_0001"
down_revision = "20260421_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Add columns to users
    op.add_column("users", sa.Column("phone_number", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("profile_picture_url", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("nin_verified", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("users", sa.Column("nin_encrypted", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("nin_hash", sa.Text(), nullable=True))
    
    # 2. Add unique constraints
    op.create_unique_constraint("uq_users_phone", "users", ["phone_number"])
    op.create_unique_constraint("uq_users_nin_hash", "users", ["nin_hash"])
    op.create_unique_constraint("uq_lawyers_enrollment", "lawyers", ["enrollment_number"])


def downgrade() -> None:
    op.drop_constraint("uq_lawyers_enrollment", "lawyers", type_="unique")
    op.drop_constraint("uq_users_nin_hash", "users", type_="unique")
    op.drop_constraint("uq_users_phone", "users", type_="unique")
    op.drop_column("users", "nin_hash")
    op.drop_column("users", "nin_encrypted")
    op.drop_column("users", "nin_verified")
    op.drop_column("users", "profile_picture_url")
    op.drop_column("users", "phone_number")
