import { NextResponse } from "next/server";
import { mockDb } from "@/lib/mockDb";

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const notificationId = Number(id);

    const notification = mockDb.notifications.find(
      (n) => n.notification_id === notificationId || n.id === notificationId
    );

    if (notification) {
      notification.is_read = true;
      return NextResponse.json(notification);
    }

    return NextResponse.json(
      { notification_id: notificationId, is_read: true },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json({ error: "Failed to mark notification as read" }, { status: 400 });
  }
}
