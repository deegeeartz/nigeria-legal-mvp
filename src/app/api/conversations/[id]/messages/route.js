import { NextResponse } from "next/server";
import { mockDb } from "@/lib/mockDb";

export async function GET(request, { params }) {
  const { id } = await params;
  const msgs = mockDb.messages.filter((m) => String(m.conversation_id) === String(id));
  return NextResponse.json(msgs);
}

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const newMsg = {
      id: mockDb.messages.length + 1,
      message_id: mockDb.messages.length + 1,
      conversation_id: Number(id),
      sender_user_id: mockDb.currentUser?.user_id || 1,
      body: body.body,
      created_on: new Date().toISOString()
    };
    mockDb.messages.push(newMsg);
    return NextResponse.json(newMsg, { status: 201 });
  } catch (err) {
    return NextResponse.json({ detail: "Failed to send message" }, { status: 400 });
  }
}
