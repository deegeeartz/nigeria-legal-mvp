import { NextResponse } from "next/server";
import { mockDb, USERS } from "@/lib/mockDb";

export async function POST(request) {
  if (!mockDb.currentUser) {
    mockDb.currentUser = USERS[0];
  }
  return NextResponse.json({ message: "Refreshed" });
}
