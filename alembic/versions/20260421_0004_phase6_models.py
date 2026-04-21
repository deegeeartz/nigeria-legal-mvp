"""Phase 6: Targeted Pro Bono, Contingency Fees & VAT

Revision ID: 20260421_0004
Revises: 20260421_0003
Create Date: 2026-04-21
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "20260421_0004"
down_revision = "20260421_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Lawyers: Targeted Pro Bono Categories
    op.add_column("lawyers", sa.Column("pro_bono_practice_areas", sa.Text(), nullable=True))

    # Consultations: Success-based Billing
    op.add_column("consultations", sa.Column("is_contingency", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("consultations", sa.Column("contingency_percentage", sa.Float(), nullable=True))

    # Payments: VAT Compliance & NIP/Virtual Accounts
    op.add_column("payments", sa.Column("vat_amount_ngn", sa.Integer(), nullable=False, server_default=sa.text("0")))
    op.add_column("payments", sa.Column("total_plus_vat_ngn", sa.Integer(), nullable=False, server_default=sa.text("0")))
    op.add_column("payments", sa.Column("payment_method", sa.Text(), nullable=False, server_default="card"))


def downgrade() -> None:
    op.drop_column("payments", "payment_method")
    op.drop_column("payments", "total_plus_vat_ngn")
    op.drop_column("payments", "vat_amount_ngn")
    op.drop_column("consultations", "contingency_percentage")
    op.drop_column("consultations", "is_contingency")
    op.drop_column("lawyers", "pro_bono_practice_areas")
