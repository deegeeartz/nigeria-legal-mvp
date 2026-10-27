import { NextResponse } from "next/server";
import { mockDb } from "@/lib/mockDb";

export async function GET(request) {
  return NextResponse.json(mockDb.consultations);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const newId = mockDb.consultations.length + 101;
    const newConsultation = {
      consultation_id: newId,
      client_id: mockDb.currentUser?.user_id || 1,
      lawyer_id: body.lawyer_id || "lw_001",
      scheduled_for: body.scheduled_for || new Date().toISOString(),
      summary: body.summary || "Legal Consultation",
      status: "pending",
      created_on: new Date().toISOString(),
      video_room_url: `https://meet.jit.si/NigeriaLegalConsultation_${newId}`
    };
    mockDb.consultations.unshift(newConsultation);

    mockDb.auditEvents.unshift({
      audit_event_id: mockDb.auditEvents.length + 1,
      action: "consultation.booked",
      detail: `Consultation #${newId} requested`,
      resource_type: "consultation",
      resource_id: String(newId),
      actor_user_id: mockDb.currentUser?.user_id || 1,
      created_on: new Date().toISOString()
    });

    return NextResponse.json(newConsultation, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create consultation" }, { status: 400 });
  }
}
