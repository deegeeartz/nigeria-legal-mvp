"""Migrate date columns from Text to TIMESTAMP WITH TIME ZONE

Revision ID: 20260421_0001
Revises: 20260420_0006
Create Date: 2026-04-21
"""
from alembic import op
import sqlalchemy as sa


revision = "20260421_0001"
down_revision = "20260420_0006"
branch_labels = None
depends_on = None


# Tables and columns that need to be migrated from Text to TIMESTAMPTZ
MAP = {
    "users": ["created_on"],
    "sessions": ["created_on", "access_expires_at", "refresh_expires_at"],
    "complaints": ["created_on", "resolved_on"],
    "kyc_events": ["updated_on"],
    "kyc_documents": ["created_on"],
    "conversations": ["created_on"],
    "messages": ["created_on"],
    "consultations": ["scheduled_for", "created_on"],
    "documents": ["created_on"],
    "payments": ["created_on", "paid_on", "released_on"],
    "consultation_milestones": ["created_on"],
    "consultation_notes": ["created_on"],
    "audit_events": ["created_on"],
    "notifications": ["created_on", "read_on"],
    "consent_events": ["created_on"],
    "dsr_requests": ["created_on", "updated_on", "resolved_on"],
    "dsr_corrections": ["created_on", "updated_on", "reviewed_on"],
    "breach_incidents": ["created_on", "updated_on", "occurred_on", "detected_on", "ndpc_reported_on", "contained_on", "resolved_on"],
}


def upgrade() -> None:
    for table, columns in MAP.items():
        for col in columns:
            op.alter_column(
                table,
                col,
                type_=sa.DateTime(timezone=True),
                postgresql_using=f"NULLIF({col}, '')::timestamptz",
                existing_type=sa.Text(),
                existing_nullable=True if col in {"resolved_on", "paid_on", "released_on", "read_on", "reviewed_on", "occurred_on", "ndpc_reported_on", "contained_on"} else False
            )


def downgrade() -> None:
    for table, columns in MAP.items():
        for col in columns:
            op.alter_column(
                table,
                col,
                type_=sa.Text(),
                postgresql_using=f"{col}::text",
                existing_type=sa.DateTime(timezone=True)
            )
