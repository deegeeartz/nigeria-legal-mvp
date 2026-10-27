import { NextResponse } from "next/server";
import { mockDb } from "@/lib/mockDb";

export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const lawyerId = searchParams.get("lawyer_id") || "lw_001";
    const practiceYear = Number(searchParams.get("practice_year") || 2026);

    mockDb.practiceSeals[lawyerId] = {
      seal_year: practiceYear,
      cpd_compliant: true,
      has_valid_seal: true
    };

    mockDb.auditEvents.unshift({
      audit_event_id: mockDb.auditEvents.length + 1,
      action: "document.uploaded",
      detail: `Annual Stamp & Seal for year ${practiceYear} uploaded`,
      resource_type: "seal",
      resource_id: lawyerId,
      actor_user_id: mockDb.currentUser?.user_id || 2,
      created_on: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      practice_year: practiceYear,
      lawyer_id: lawyerId
    });
  } catch (err) {
    return NextResponse.json({ detail: "Upload failed" }, { status: 400 });
  }
}
