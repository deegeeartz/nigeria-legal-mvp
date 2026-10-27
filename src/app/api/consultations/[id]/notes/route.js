import { NextResponse } from "next/server";
import { mockDb } from "@/lib/mockDb";

export async function GET(request, { params }) {
  const { id } = await params;
  const notes = mockDb.notes.filter((n) => String(n.consultation_id) === String(id));
  return NextResponse.json(notes);
}

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const newNote = {
      id: `note_${Date.now()}`,
      consultation_id: Number(id),
      author_user_id: mockDb.currentUser?.user_id || 1,
      body: body.body,
      is_private: Boolean(body.is_private),
      created_on: new Date().toISOString()
    };
    mockDb.notes.unshift(newNote);
    return NextResponse.json(newNote, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to add note" }, { status: 400 });
  }
}
