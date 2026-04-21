import asyncio
import os
import sys
from datetime import datetime, timedelta, UTC

if sys.platform == "win32":
    import asyncio
    import selectors
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

# Add project root to path
sys.path.append(os.getcwd())

from app.db import (
    init_db,
    create_user,
    save_lawyer,
    upsert_kyc_status,
    create_consultation,
    update_consultation_status,
    create_payment,
    create_document,
    upsert_practice_seal,
    log_audit_event,
)
from app.models import Lawyer
from app.repos.connection import _hash_password, _now, connect, _db_bool, _serialize_practice_areas

async def ensure_lawyer(lawyer: Lawyer):
    """Ensure a lawyer exists in the DB (INSERT if missing)."""
    async with connect() as conn:
        res = await conn.execute("SELECT id FROM lawyers WHERE id = ?", (lawyer.id,))
        if res.fetchone():
            return
        
        await conn.execute(
            """
            INSERT INTO lawyers (
                id, full_name, state, practice_areas, years_called, nin_verified, nba_verified,
                bvn_verified, profile_completeness, completed_matters, rating, response_rate,
                avg_response_hours, repeat_client_rate, base_consult_fee_ngn, active_complaints, severe_flag,
                enrollment_number, kyc_submission_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                lawyer.id, lawyer.full_name, lawyer.state, _serialize_practice_areas(lawyer.practice_areas),
                lawyer.years_called, _db_bool(lawyer.nin_verified), _db_bool(lawyer.nba_verified),
                _db_bool(lawyer.bvn_verified), lawyer.profile_completeness, lawyer.completed_matters,
                lawyer.rating, lawyer.response_rate, lawyer.avg_response_hours, lawyer.repeat_client_rate,
                lawyer.base_consult_fee_ngn, lawyer.active_complaints, _db_bool(lawyer.severe_flag),
                lawyer.enrollment_number, lawyer.kyc_submission_status
            )
        )
        await conn.commit()

async def seed_demo_data():
    print("Initialize DB...")
    await init_db()
    
    # 1. Admin Account
    print("Seeding Admin...")
    admin_user = await create_user("admin@legalmvp.local", "AdminPass123!", "Platform Admin", "admin")
    admin_id = admin_user["id"] if admin_user else 1

    # 2. Verified Lawyer: Funke Ade
    print("Seeding Verified Lawyer: Funke Ade...")
    lawyer_funke = Lawyer(
        id="funke-ade-123",
        full_name="Funke Ade",
        state="Lagos",
        practice_areas="Corporate Law, Intellectual Property",
        years_called=12,
        nin_verified=True,
        nba_verified=True,
        bvn_verified=True,
        profile_completeness=95,
        completed_matters=45,
        rating=4.9,
        response_rate=98,
        avg_response_hours=2.5,
        repeat_client_rate=80,
        base_consult_fee_ngn=15000,
        active_complaints=0,
        severe_flag=False,
        enrollment_number="SCN/12345/FUNKE",
        kyc_submission_status="verified"
    )
    await ensure_lawyer(lawyer_funke)
    await save_lawyer(lawyer_funke)
    user_funke = await create_user("funke.ade@legalmvp.local", "LawyerPass123!", "Funke Ade", "lawyer", lawyer_id="funke-ade-123")
    
    # KYC Status & Seal for Funke
    await upsert_kyc_status("funke-ade-123", nin_verified=True, nba_verified=True, bvn_verified=True, note="Auto-verified for demo")
    await upsert_practice_seal("funke-ade-123", 2026, bpf_paid=True, cpd_points=15, seal_file_key="AD-2026-FUNKE-SEAL")

    # 3. Pending Lawyer: Chidi Obi
    print("Seeding Pending Lawyer: Chidi Obi...")
    lawyer_chidi = Lawyer(
        id="chidi-obi-456",
        full_name="Chidi Obi",
        state="Abuja",
        practice_areas="Criminal Law, Family Law",
        years_called=4,
        nin_verified=True,
        nba_verified=False,
        bvn_verified=True,
        profile_completeness=60,
        completed_matters=5,
        rating=4.2,
        response_rate=70,
        avg_response_hours=12.0,
        repeat_client_rate=20,
        base_consult_fee_ngn=5000,
        active_complaints=0,
        severe_flag=False,
        enrollment_number="SCN/67890/CHIDI",
        kyc_submission_status="pending"
    )
    await ensure_lawyer(lawyer_chidi)
    await save_lawyer(lawyer_chidi)
    await create_user("chidi.obi@legalmvp.local", "LawyerPass123!", "Chidi Obi", "lawyer", lawyer_id="chidi-obi-456")
    await upsert_kyc_status("chidi-obi-456", nin_verified=True, nba_verified=False, bvn_verified=True, note="Awaiting NBA verification")



    # 4. Client Account: Tunde
    print("Seeding Client: Tunde...")
    user_tunde = await create_user("tunde.nigeria@legalmvp.local", "ClientPass123!", "Tunde Nigeria", "client")
    
    # 5. Historical Data
    if user_tunde and user_funke:
        print("Seeding Historical Consultations...")
        # Past Consultation
        c1 = await create_consultation(user_tunde["id"], "funke-ade-123", "2026-03-15T10:00:00Z", "Registration of a tech startup in Lagos", "startup-reg")
        await update_consultation_status(c1["id"], "completed")
        
        # Current Active Consultation
        c2 = await create_consultation(user_tunde["id"], "funke-ade-123", "2026-05-10T14:00:00Z", "Review of a lease agreement for office space in Lekki Phase 1", "Agreement Review")
        
        # Payment for Current Consultation
        print("Seeding Payment for Active Consultation...")
        p = await create_payment(c2["id"], provider="paystack", amount_ngn=15000)
        
        # Auto-generate engagement letter (simulated document storage)
        print("Seeding Engagement Letter...")
        await create_document(
            consultation_id=c2["id"],
            uploaded_by_user_id=admin_id,
            document_label="Engagement Letter",
            original_filename="Engagement_funke_ade.pdf",
            content_type="application/pdf",
            file_bytes=b"DUMMY_PDF_CONTENT"
        )
        
        await log_audit_event(user_tunde["id"], "demo.initialized", "system", "all", "Demo data seeded successfully")

    print("\nDEMO ACCOUNTS READY:")
    print("--------------------")
    print("ADMIN:  admin@legalmvp.local / AdminPass123!")
    print("LAWYER: funke.ade@legalmvp.local / LawyerPass123! (Verified)")
    print("LAWYER: chidi.obi@legalmvp.local / LawyerPass123! (Pending)")
    print("CLIENT: tunde.nigeria@legalmvp.local / ClientPass123!")
    print("--------------------")

if __name__ == "__main__":
    asyncio.run(seed_demo_data())
