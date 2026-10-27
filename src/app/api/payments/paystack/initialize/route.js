import { NextResponse } from "next/server";
import { mockDb } from "@/lib/mockDb";

export async function POST(request) {
  try {
    const body = await request.json();
    const reference = `PSK_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    mockDb.auditEvents.unshift({
      audit_event_id: mockDb.auditEvents.length + 1,
      action: "payment.created",
      detail: `Paystack escrow initialized for consultation #${body.consultation_id}`,
      resource_type: "payment",
      resource_id: reference,
      actor_user_id: mockDb.currentUser?.user_id || 1,
      created_on: new Date().toISOString()
    });

    return NextResponse.json({
      status: true,
      message: "Authorization URL created",
      reference,
      authorization_url: `https://checkout.paystack.com/${reference}`
    });
  } catch (err) {
    return NextResponse.json({ error: "Payment initialization failed" }, { status: 400 });
  }
}
