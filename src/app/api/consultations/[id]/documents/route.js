import { NextResponse } from "next/server";
import { mockDb } from "@/lib/mockDb";

export async function GET(request, { params }) {
  const { id } = await params;
  const docs = mockDb.documents.filter((d) => String(d.consultation_id) === String(id));
  return NextResponse.json(docs);
}

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    const label = formData.get("document_label") || "Supporting Document";
    const file = formData.get("file");

    const newDoc = {
      document_id: `doc_${Date.now()}`,
      consultation_id: Number(id),
      document_label: String(label),
      original_filename: file?.name || "document.pdf",
      content_type: file?.type || "application/pdf",
      uploaded_at: new Date().toISOString()
    };
    mockDb.documents.unshift(newDoc);

    mockDb.auditEvents.unshift({
      audit_event_id: mockDb.auditEvents.length + 1,
      action: "document.uploaded",
      detail: `Document ${newDoc.original_filename} uploaded for consultation #${id}`,
      resource_type: "document",
      resource_id: newDoc.document_id,
      actor_user_id: mockDb.currentUser?.user_id || 1,
      created_on: new Date().toISOString()
    });

    return NextResponse.json(newDoc, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to upload document" }, { status: 400 });
  }
}
