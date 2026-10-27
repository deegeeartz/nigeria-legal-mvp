import { NextResponse } from "next/server";
import { mockDb } from "@/lib/mockDb";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const lawyerId = searchParams.get("lawyer_id") || "lw_001";

  const seal = mockDb.practiceSeals[lawyerId] || {
    seal_year: 2026,
    cpd_compliant: true,
    has_valid_seal: true
  };

  return NextResponse.json(seal);
}
