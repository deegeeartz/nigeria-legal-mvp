import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  const { id } = await params;
  return NextResponse.json({
    lawyer_id: id,
    kyc_submission_status: "verified",
    nin_verified: true,
    nba_verified: true,
    bvn_verified: true,
    enrollment_number: "SCN089421",
    updated_on: new Date().toLocaleDateString()
  });
}
