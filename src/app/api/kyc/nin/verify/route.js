import { NextResponse } from "next/server";

export async function POST(request) {
  return NextResponse.json({
    nin_verified: true,
    kyc_submission_status: "verified",
    nba_verified: true,
    bvn_verified: true,
    updated_on: new Date().toLocaleDateString()
  });
}
