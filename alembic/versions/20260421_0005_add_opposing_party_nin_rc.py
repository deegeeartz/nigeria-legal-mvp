"""Add opposing_party_nin and opposing_party_rc_number to consultations

Revision ID: 20260421_0005
Revises: 20260421_0004
Create Date: 2026-04-21

Strengthens the conflict-of-interest engine to match on NIN (individuals)
and CAC RC number (companies) in addition to the existing name-string match.
NIN and RC matches are definitive identifiers, eliminating false negatives
from name variations (e.g. "Dangote Group" vs "DANGOTE GROUP LIMITED").
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260421_0005"
down_revision = "20260421_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "consultations",
        sa.Column(
            "opposing_party_nin",
            sa.Text(),
            nullable=True,
            comment="NIN of the opposing party (individual). Used for definitive conflict-of-interest detection.",
        ),
    )
    op.add_column(
        "consultations",
        sa.Column(
            "opposing_party_rc_number",
            sa.Text(),
            nullable=True,
            comment="CAC RC number of the opposing party (company). Used for definitive conflict-of-interest detection.",
        ),
    )
    # Index both for fast lookup during conflict checks
    op.create_index(
        "ix_consultations_opposing_party_nin",
        "consultations",
        ["lawyer_id", "opposing_party_nin"],
        unique=False,
    )
    op.create_index(
        "ix_consultations_opposing_party_rc",
        "consultations",
        ["lawyer_id", "opposing_party_rc_number"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_consultations_opposing_party_rc", table_name="consultations")
    op.drop_index("ix_consultations_opposing_party_nin", table_name="consultations")
    op.drop_column("consultations", "opposing_party_rc_number")
    op.drop_column("consultations", "opposing_party_nin")
