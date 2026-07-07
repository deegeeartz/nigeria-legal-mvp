"""knowledge_hub_and_geolocation

Revision ID: 4a67bbd13475
Revises: 20260506_0001
Create Date: 2026-07-07 16:30:26.766670
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '4a67bbd13475'
down_revision = '20260506_0001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Update lawyers table
    op.add_column("lawyers", sa.Column("knowledge_contribution_score", sa.Float(), nullable=False, server_default="0.0"))
    op.add_column("lawyers", sa.Column("latitude", sa.Float(), nullable=True))
    op.add_column("lawyers", sa.Column("longitude", sa.Float(), nullable=True))

    # 2. Knowledge Hub Tables
    op.create_table(
        "public_questions",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("category", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False, server_default="open"),
        sa.Column("created_on", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "lawyer_answers",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("question_id", sa.Integer(), nullable=False),
        sa.Column("lawyer_id", sa.Text(), nullable=False),
        sa.Column("answer_body", sa.Text(), nullable=False),
        sa.Column("upvotes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_on", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["question_id"], ["public_questions.id"]),
        sa.ForeignKeyConstraint(["lawyer_id"], ["lawyers.id"]),
    )

    op.create_table(
        "educational_articles",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("lawyer_id", sa.Text(), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("upvotes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_on", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["lawyer_id"], ["lawyers.id"]),
    )

    # 3. Document Templates
    op.create_table(
        "document_templates",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("category", sa.Text(), nullable=False),
        sa.Column("price_ngn", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_on", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )


def downgrade() -> None:
    op.drop_table("document_templates")
    op.drop_table("educational_articles")
    op.drop_table("lawyer_answers")
    op.drop_table("public_questions")
    op.drop_column("lawyers", "longitude")
    op.drop_column("lawyers", "latitude")
    op.drop_column("lawyers", "knowledge_contribution_score")
