"""Initial PostgreSQL-ready schema

Revision ID: 20260420_0001
Revises:
Create Date: 2026-04-20
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "20260420_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "lawyers",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("full_name", sa.Text(), nullable=False),
        sa.Column("state", sa.Text(), nullable=False),
        sa.Column("practice_areas", sa.Text(), nullable=False),
        sa.Column("years_called", sa.Integer(), nullable=False),
        sa.Column("nin_verified", sa.Boolean(), nullable=False),
        sa.Column("nba_verified", sa.Boolean(), nullable=False),
        sa.Column("bvn_verified", sa.Boolean(), nullable=False),
        sa.Column("profile_completeness", sa.Integer(), nullable=False),
        sa.Column("completed_matters", sa.Integer(), nullable=False),
        sa.Column("rating", sa.Float(), nullable=False),
        sa.Column("response_rate", sa.Integer(), nullable=False),
        sa.Column("avg_response_hours", sa.Float(), nullable=False),
        sa.Column("repeat_client_rate", sa.Integer(), nullable=False),
        sa.Column("base_consult_fee_ngn", sa.Integer(), nullable=False),
        sa.Column("active_complaints", sa.Integer(), nullable=False),
        sa.Column("severe_flag", sa.Boolean(), nullable=False),
        sa.Column("enrollment_number", sa.Text(), nullable=True),
        sa.Column("verification_document_id", sa.Integer(), nullable=True),
        sa.Column("kyc_submission_status", sa.Text(), nullable=True, server_default="none"),
        sa.Column("nin", sa.Text(), nullable=True),
    )

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("email", sa.Text(), nullable=False, unique=True),
        sa.Column("password_hash", sa.Text(), nullable=False),
        sa.Column("full_name", sa.Text(), nullable=False),
        sa.Column("role", sa.Text(), nullable=False),
        sa.Column("lawyer_id", sa.Text(), nullable=True),
        sa.Column("created_on", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(["lawyer_id"], ["lawyers.id"]),
    )

    op.create_table(
        "sessions",
        sa.Column("access_token", sa.Text(), primary_key=True),
        sa.Column("refresh_token", sa.Text(), nullable=False, unique=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("created_on", sa.Text(), nullable=False),
        sa.Column("access_expires_at", sa.Text(), nullable=False),
        sa.Column("refresh_expires_at", sa.Text(), nullable=False),
        sa.Column("revoked", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
    )

    op.create_table(
        "complaints",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("lawyer_id", sa.Text(), nullable=False),
        sa.Column("category", sa.Text(), nullable=False),
        sa.Column("severity", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("details", sa.Text(), nullable=False),
        sa.Column("created_on", sa.Text(), nullable=False),
        sa.Column("resolved_on", sa.Text(), nullable=True),
        sa.Column("resolution_note", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["lawyer_id"], ["lawyers.id"]),
    )

    op.create_table(
        "kyc_events",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("lawyer_id", sa.Text(), nullable=False),
        sa.Column("nin_verified", sa.Boolean(), nullable=False),
        sa.Column("nba_verified", sa.Boolean(), nullable=False),
        sa.Column("bvn_verified", sa.Boolean(), nullable=False),
        sa.Column("note", sa.Text(), nullable=False),
        sa.Column("updated_on", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(["lawyer_id"], ["lawyers.id"]),
    )

    op.create_table(
        "kyc_documents",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("lawyer_id", sa.Text(), nullable=False),
        sa.Column("uploaded_by_user_id", sa.Integer(), nullable=False),
        sa.Column("original_filename", sa.Text(), nullable=False),
        sa.Column("storage_key", sa.Text(), nullable=False, unique=True),
        sa.Column("content_type", sa.Text(), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("created_on", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(["lawyer_id"], ["lawyers.id"]),
        sa.ForeignKeyConstraint(["uploaded_by_user_id"], ["users.id"]),
    )

    op.create_table(
        "conversations",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("client_user_id", sa.Integer(), nullable=False),
        sa.Column("lawyer_id", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("created_on", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(["client_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["lawyer_id"], ["lawyers.id"]),
    )

    op.create_table(
        "messages",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("conversation_id", sa.Integer(), nullable=False),
        sa.Column("sender_user_id", sa.Integer(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("created_on", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(["conversation_id"], ["conversations.id"]),
        sa.ForeignKeyConstraint(["sender_user_id"], ["users.id"]),
    )

    op.create_table(
        "consultations",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("client_user_id", sa.Integer(), nullable=False),
        sa.Column("lawyer_id", sa.Text(), nullable=False),
        sa.Column("scheduled_for", sa.Text(), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("created_on", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(["client_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["lawyer_id"], ["lawyers.id"]),
    )

    op.create_table(
        "documents",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("consultation_id", sa.Integer(), nullable=False),
        sa.Column("uploaded_by_user_id", sa.Integer(), nullable=False),
        sa.Column("document_label", sa.Text(), nullable=False),
        sa.Column("original_filename", sa.Text(), nullable=False),
        sa.Column("storage_key", sa.Text(), nullable=False, unique=True),
        sa.Column("content_type", sa.Text(), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("created_on", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(["consultation_id"], ["consultations.id"]),
        sa.ForeignKeyConstraint(["uploaded_by_user_id"], ["users.id"]),
    )

    op.create_table(
        "payments",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("consultation_id", sa.Integer(), nullable=False),
        sa.Column("reference", sa.Text(), nullable=False, unique=True),
        sa.Column("provider", sa.Text(), nullable=False),
        sa.Column("amount_ngn", sa.Integer(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("created_on", sa.Text(), nullable=False),
        sa.Column("access_code", sa.Text(), nullable=True),
        sa.Column("authorization_url", sa.Text(), nullable=True),
        sa.Column("gateway_status", sa.Text(), nullable=True),
        sa.Column("paid_on", sa.Text(), nullable=True),
        sa.Column("released_on", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["consultation_id"], ["consultations.id"]),
    )

    op.create_table(
        "consultation_milestones",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("consultation_id", sa.Integer(), nullable=False),
        sa.Column("event_name", sa.Text(), nullable=False),
        sa.Column("status_label", sa.Text(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_on", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(["consultation_id"], ["consultations.id"]),
    )

    op.create_table(
        "consultation_notes",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("consultation_id", sa.Integer(), nullable=False),
        sa.Column("author_user_id", sa.Integer(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("is_private", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_on", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(["consultation_id"], ["consultations.id"]),
        sa.ForeignKeyConstraint(["author_user_id"], ["users.id"]),
    )

    op.create_table(
        "audit_events",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("actor_user_id", sa.Integer(), nullable=True),
        sa.Column("action", sa.Text(), nullable=False),
        sa.Column("resource_type", sa.Text(), nullable=False),
        sa.Column("resource_id", sa.Text(), nullable=True),
        sa.Column("detail", sa.Text(), nullable=False),
        sa.Column("created_on", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"]),
    )

    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("kind", sa.Text(), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("resource_type", sa.Text(), nullable=False),
        sa.Column("resource_id", sa.Text(), nullable=True),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_on", sa.Text(), nullable=False),
        sa.Column("read_on", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
    )

    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_sessions_refresh_token", "sessions", ["refresh_token"], unique=True)
    op.create_index("ix_complaints_lawyer_id", "complaints", ["lawyer_id"])
    op.create_index("ix_conversations_client_user_id", "conversations", ["client_user_id"])
    op.create_index("ix_consultations_lawyer_id", "consultations", ["lawyer_id"])
    op.create_index("ix_payments_reference", "payments", ["reference"], unique=True)
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_notifications_user_id", table_name="notifications")
    op.drop_index("ix_payments_reference", table_name="payments")
    op.drop_index("ix_consultations_lawyer_id", table_name="consultations")
    op.drop_index("ix_conversations_client_user_id", table_name="conversations")
    op.drop_index("ix_complaints_lawyer_id", table_name="complaints")
    op.drop_index("ix_sessions_refresh_token", table_name="sessions")
    op.drop_index("ix_users_email", table_name="users")

    op.drop_table("notifications")
    op.drop_table("audit_events")
    op.drop_table("consultation_notes")
    op.drop_table("consultation_milestones")
    op.drop_table("payments")
    op.drop_table("documents")
    op.drop_table("consultations")
    op.drop_table("messages")
    op.drop_table("conversations")
    op.drop_table("kyc_documents")
    op.drop_table("kyc_events")
    op.drop_table("complaints")
    op.drop_table("sessions")
    op.drop_table("users")
    op.drop_table("lawyers")
