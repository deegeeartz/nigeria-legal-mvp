import { NextResponse } from "next/server";
import { mockDb } from "@/lib/mockDb";

export async function GET(request) {
  return NextResponse.json(mockDb.notifications);
}
