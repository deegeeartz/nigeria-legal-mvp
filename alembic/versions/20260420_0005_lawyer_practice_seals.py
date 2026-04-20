"""Add digital practice seal and stamp tracking (APL/CPD compliance layer).

Revision ID: 20260420_0005
Revises: 20260420_0004
Create Date: 2026-04-20 10:00:00.000000

This migration adds support for NBA-mandated digital practice seals showing:
- BPF annual practising list eligibility
- CPD points compliance (≥5 points for 2026 renewal)
- Encrypted seal document storage (not visible to public, verification only)
- Audit trail for seal uploads and verification
- Integration with lawyer trust scoring and profile badges

Schema: lawyer_practice_seals (yearly, immutable records with source provenance)
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260420_0005'
down_revision = '20260420_0004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create lawyer_practice_seals table
    op.create_table(
        'lawyer_practice_seals',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('lawyer_id', sa.String(36), sa.ForeignKey('lawyers.id', ondelete='CASCADE'), nullable=False),
        sa.Column('practice_year', sa.Integer, nullable=False),
        
        # BPF & CPD Compliance Data
        sa.Column('bpf_paid', sa.Boolean, default=False),
        sa.Column('bpf_paid_date', sa.Date, nullable=True),
        sa.Column('cpd_points', sa.Integer, default=0),
        sa.Column('cpd_threshold', sa.Integer, default=5),
        
        # Compliance derived fields (read-only, computed)
        sa.Column('cpd_compliant', sa.Boolean, default=False),  # bpf_paid AND cpd_points >= cpd_threshold
        sa.Column('aplineligible', sa.Boolean, default=False),  # bpf_paid (Annual Practising List)
        
        # Seal document storage (encrypted at rest)
        sa.Column('seal_file_key', sa.String(128), nullable=True),  # encrypted filename ref
        sa.Column('seal_mime_type', sa.String(64), nullable=True),  # application/pdf, image/png, etc
        sa.Column('seal_uploaded_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('seal_expires_at', sa.DateTime(timezone=True), nullable=True),
        
        # Audit trail
        sa.Column('source', sa.String(32), default='manual'),  # manual | nba_api | csv_import | admin_override
        sa.Column('source_ref', sa.String(256), nullable=True),  # external reference (URL, batch ID, etc)
        sa.Column('verified_by_user_id', sa.Integer, nullable=True),  # admin who verified
        sa.Column('verified_on', sa.Date, nullable=True),
        sa.Column('verification_notes', sa.Text, nullable=True),
        sa.Column('created_on', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_on', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    
    # Indexes for performance
    op.create_index('idx_lawyer_practice_seals_lawyer_year', 'lawyer_practice_seals', ['lawyer_id', 'practice_year'], unique=True)
    op.create_index('idx_lawyer_practice_seals_year_compliant', 'lawyer_practice_seals', ['practice_year', 'cpd_compliant'])
    op.create_index('idx_lawyer_practice_seals_year_apl', 'lawyer_practice_seals', ['practice_year', 'aplineligible'])
    op.create_index('idx_lawyer_practice_seals_seal_expires', 'lawyer_practice_seals', ['seal_expires_at'])
    
    # Audit trail table for seal operations
    op.create_table(
        'seal_events',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('lawyer_id', sa.String(36), sa.ForeignKey('lawyers.id', ondelete='CASCADE'), nullable=False),
        sa.Column('practice_year', sa.Integer, nullable=False),
        sa.Column('action', sa.String(64), nullable=False),  # seal_uploaded, seal_verified, seal_rejected, seal_expired
        sa.Column('actor_user_id', sa.Integer, nullable=True),  # admin who took action, null if automated
        sa.Column('detail', sa.Text, nullable=True),
        sa.Column('created_on', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    
    op.create_index('idx_seal_events_lawyer_year', 'seal_events', ['lawyer_id', 'practice_year'])
    op.create_index('idx_seal_events_action', 'seal_events', ['action'])
    
    # Add seal-related fields to lawyers table
    op.add_column('lawyers', sa.Column('latest_seal_year', sa.Integer, nullable=True))
    op.add_column('lawyers', sa.Column('latest_seal_expires_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('lawyers', sa.Column('seal_badge_visible', sa.Boolean, default=False))  # if True, show badge on profile


def downgrade() -> None:
    op.drop_column('lawyers', 'seal_badge_visible')
    op.drop_column('lawyers', 'latest_seal_expires_at')
    op.drop_column('lawyers', 'latest_seal_year')
    
    op.drop_index('idx_seal_events_action')
    op.drop_index('idx_seal_events_lawyer_year')
    op.drop_table('seal_events')
    
    op.drop_index('idx_lawyer_practice_seals_seal_expires')
    op.drop_index('idx_lawyer_practice_seals_year_apl')
    op.drop_index('idx_lawyer_practice_seals_year_compliant')
    op.drop_index('idx_lawyer_practice_seals_lawyer_year')
    op.drop_table('lawyer_practice_seals')
