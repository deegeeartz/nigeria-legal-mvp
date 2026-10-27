import { NextResponse } from "next/server";

export async function GET(request) {
  return NextResponse.json({ ticket: "mock_ws_ticket_123" });
}
