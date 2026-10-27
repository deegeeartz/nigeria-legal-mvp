import { NextResponse } from "next/server";
import { mockDb, USERS } from "@/lib/mockDb";

export async function GET(request) {
  const user = mockDb.currentUser || USERS[0];
  return NextResponse.json(user);
}
