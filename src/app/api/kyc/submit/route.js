import { NextResponse } from "next/server";
import { mockDb } from "@/lib/mockDb";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const enrollmentNumber = formData.get("enrollment_number") || "SCN102938";
    const nin = formData.get("nin") || "";

    const statusObj = {
      kyc_submission_status: "pending",
      nin_verified: Boolean(nin),
      nba_verified: false,
      bvn_verified: false,
      enrollment_number: String(enrollmentNumber),
      updated_on: new Date().toLocaleDateString()
    };

    mockDb.auditEvents.unshift({
      audit_event_id: mockDb.auditEvents.length + 1,
      action: "kyc.submitted",
      detail: `KYC submitted with enrollment #${enrollmentNumber}`,
      resource_type: "kyc",
      resource_id: mockDb.currentUser?.lawyer_id || "lw_001",
      actor_user_id: mockDb.currentUser?.user_id || 2,
      created_on: new Date().toISOString()
    });

    return NextResponse.json(statusObj);
  } catch (err) {
    return NextResponse.json({ detail: "Submission failed" }, { status: 400 });
  }
}
