"""Create lawyer_reviews table

Revision ID: 20260506_0001
Revises: 20260504_0001
Create Date: 2026-05-06
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "20260506_0001"
down_revision = "20260504_0001"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table(
        "lawyer_reviews",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("consultation_id", sa.Integer, sa.ForeignKey("consultations.id"), nullable=False, unique=True),
        sa.Column("client_user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("lawyer_id", sa.String(40), nullable=False),
        sa.Column("rating", sa.Integer, nullable=False),  # 1-5
        sa.Column("review_text", sa.Text, nullable=True),
        sa.Column("lawyer_reply", sa.Text, nullable=True),
        sa.Column("lawyer_replied_on", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_on", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_lawyer_reviews_lawyer_id", "lawyer_reviews", ["lawyer_id"])
    op.create_index("ix_lawyer_reviews_client_user_id", "lawyer_reviews", ["client_user_id"])

def downgrade() -> None:
    op.drop_index("ix_lawyer_reviews_client_user_id")
    op.drop_index("ix_lawyer_reviews_lawyer_id")
    op.drop_table("lawyer_reviews")
