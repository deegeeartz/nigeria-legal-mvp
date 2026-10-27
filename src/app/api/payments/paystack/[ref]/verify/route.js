import { NextResponse } from "next/server";
import { mockDb } from "@/lib/mockDb";

export async function POST(request, { params }) {
  const { ref } = await params;
  mockDb.auditEvents.unshift({
    audit_event_id: mockDb.auditEvents.length + 1,
    action: "payment.released",
    detail: `Payment ref ${ref} verified and secured in escrow`,
    resource_type: "payment",
    resource_id: String(ref),
    actor_user_id: mockDb.currentUser?.user_id || 1,
    created_on: new Date().toISOString()
  });

  return NextResponse.json({
    status: true,
    message: "Verification successful",
    data: {
      status: "success",
      reference: ref,
      amount: 2500000,
      currency: "NGN"
    }
  });
}
