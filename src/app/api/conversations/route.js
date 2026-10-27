import { NextResponse } from "next/server";
import { mockDb } from "@/lib/mockDb";

export async function GET(request) {
  return NextResponse.json(mockDb.conversations);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const newConvId = mockDb.conversations.length + 1;
    const newConv = {
      conversation_id: newConvId,
      client_user_id: mockDb.currentUser?.user_id || 1,
      lawyer_id: body.lawyer_id || "lw_001",
      created_on: new Date().toISOString()
    };
    mockDb.conversations.unshift(newConv);

    if (body.initial_message) {
      mockDb.messages.push({
        id: mockDb.messages.length + 1,
        message_id: mockDb.messages.length + 1,
        conversation_id: newConvId,
        sender_user_id: mockDb.currentUser?.user_id || 1,
        body: body.initial_message,
        created_on: new Date().toISOString()
      });
    }

    return NextResponse.json(newConv, { status: 201 });
  } catch (err) {
    return NextResponse.json({ detail: "Failed to create conversation" }, { status: 400 });
  }
}
