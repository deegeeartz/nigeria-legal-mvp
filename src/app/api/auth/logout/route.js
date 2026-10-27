import { NextResponse } from "next/server";
import { mockDb } from "@/lib/mockDb";

export async function POST(request) {
  mockDb.currentUser = null;
  return NextResponse.json({ message: "Logged out" });
}
