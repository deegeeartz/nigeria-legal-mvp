import { NextResponse } from "next/server";
import { mockDb } from "@/lib/mockDb";

export async function GET(request, { params }) {
  const { id } = await params;
  const milestones = mockDb.milestones.filter((m) => String(m.consultation_id) === String(id));
  return NextResponse.json(milestones);
}

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const newMs = {
      id: `ms_${Date.now()}`,
      consultation_id: Number(id),
      event_name: body.event_name,
      description: body.description || "",
      created_on: new Date().toISOString()
    };
    mockDb.milestones.push(newMs);
    return NextResponse.json(newMs, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to add milestone" }, { status: 400 });
  }
}
