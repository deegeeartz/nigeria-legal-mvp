"""Add breach SLA tracking (NDPA 72-hour notification deadline).

Revision ID: 20260420_0004
Revises: 20260420_0003
Create Date: 2026-04-20 09:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260420_0004"
down_revision = "20260420_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add SLA tracking columns to breach_incidents
    op.add_column(
        "breach_incidents",
        sa.Column(
            "notification_deadline",
            sa.DateTime,
            nullable=True,
            comment="NDPA notification deadline (72 hours from discovery)",
        ),
    )
    op.add_column(
        "breach_incidents",
        sa.Column(
            "escalation_triggered",
            sa.Boolean,
            nullable=False,
            default=False,
            comment="Whether escalation alert was sent when deadline approached",
        ),
    )
    op.add_column(
        "breach_incidents",
        sa.Column(
            "escalation_triggered_at",
            sa.DateTime,
            nullable=True,
            comment="Timestamp of escalation trigger",
        ),
    )

    # Create index for SLA queries (list aging breaches by deadline)
    op.create_index(
        "idx_breach_incidents_sla_status",
        "breach_incidents",
        ["notification_deadline", "escalation_triggered"],
        mysql_length=None,
    )


def downgrade() -> None:
    op.drop_index("idx_breach_incidents_sla_status", table_name="breach_incidents")
    op.drop_column("breach_incidents", "escalation_triggered_at")
    op.drop_column("breach_incidents", "escalation_triggered")
    op.drop_column("breach_incidents", "notification_deadline")
