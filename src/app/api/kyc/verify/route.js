import { NextResponse } from "next/server";
import { mockDb } from "@/lib/mockDb";

export async function POST(request) {
  try {
    const body = await request.json();
    const { lawyer_id, nba_verified, note } = body;

    mockDb.kycPending = mockDb.kycPending.filter((item) => item.lawyer_id !== lawyer_id);

    const lawyer = mockDb.lawyers.find((lw) => lw.lawyer_id === lawyer_id);
    if (lawyer) {
      lawyer.nba_verified = Boolean(nba_verified);
    }

    mockDb.auditEvents.unshift({
      audit_event_id: mockDb.auditEvents.length + 1,
      action: nba_verified ? "kyc.verified" : "kyc.rejected",
      detail: note || (nba_verified ? "KYC Approved" : "KYC Rejected"),
      resource_type: "kyc",
      resource_id: String(lawyer_id),
      actor_user_id: mockDb.currentUser?.user_id || 3,
      created_on: new Date().toISOString()
    });

    return NextResponse.json({ success: true, lawyer_id });
  } catch (err) {
    return NextResponse.json({ detail: "Verification failed" }, { status: 400 });
  }
}
