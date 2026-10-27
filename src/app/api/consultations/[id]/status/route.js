import { NextResponse } from "next/server";
import { mockDb } from "@/lib/mockDb";

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const item = mockDb.consultations.find((c) => String(c.consultation_id) === String(id));
    if (item) {
      item.status = body.status;
      mockDb.auditEvents.unshift({
        audit_event_id: mockDb.auditEvents.length + 1,
        action: "consultation.status_updated",
        detail: `Consultation #${id} status changed to ${body.status}`,
        resource_type: "consultation",
        resource_id: String(id),
        actor_user_id: mockDb.currentUser?.user_id || 1,
        created_on: new Date().toISOString()
      });
      return NextResponse.json(item);
    }
    return NextResponse.json({ detail: "Consultation not found" }, { status: 404 });
  } catch (err) {
    return NextResponse.json({ detail: "Status update failed" }, { status: 400 });
  }
}
