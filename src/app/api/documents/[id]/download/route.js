import { NextResponse } from "next/server";
import { mockDb } from "@/lib/mockDb";

export async function GET(request, { params }) {
  const { id } = await params;
  const doc = mockDb.documents.find((d) => String(d.document_id) === String(id)) || mockDb.documents[0];

  const content = `PDF DOCUMENT DRAFT\nTitle: ${doc?.original_filename || "Document"}\nGenerated for Wigally Legal Portal.`;
  return new Response(content, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${doc?.original_filename || "document.pdf"}"`
    }
  });
}
