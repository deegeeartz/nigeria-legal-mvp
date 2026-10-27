import { NextResponse } from "next/server";
import { mockDb } from "@/lib/mockDb";

export async function POST(request) {
  try {
    const body = await request.json();
    const query = (body.summary || "").toLowerCase();

    let matches = mockDb.lawyers.filter((lw) => {
      if (!query) return true;
      return (
        lw.full_name.toLowerCase().includes(query) ||
        lw.state.toLowerCase().includes(query) ||
        lw.practice_areas.some((pa) => pa.toLowerCase().includes(query) || query.includes(pa.toLowerCase()))
      );
    });

    if (matches.length === 0) {
      matches = mockDb.lawyers.slice(0, 3);
    }

    return NextResponse.json({ matches });
  } catch (err) {
    return NextResponse.json({ matches: mockDb.lawyers.slice(0, 3) });
  }
}
