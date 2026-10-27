import { NextResponse } from "next/server";
import { mockDb } from "@/lib/mockDb";

export async function GET(request, { params }) {
  const { id } = await params;
  const lawyer = mockDb.lawyers.find((lw) => lw.lawyer_id === id) || mockDb.lawyers[0];
  return NextResponse.json(lawyer);
}
