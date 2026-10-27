import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  const { id } = await params;
  const content = `CALL TO BAR CERTIFICATE\nLawyer ID: ${id}\nSupreme Court Enrollment Verified.`;
  return new Response(content, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${id}-certificate.pdf"`
    }
  });
}
