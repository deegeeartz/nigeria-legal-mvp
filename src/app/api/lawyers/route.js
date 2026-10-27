import { NextResponse } from "next/server";
import { mockDb } from "@/lib/mockDb";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").toLowerCase().trim();
  const state = (searchParams.get("state") || "").toLowerCase().trim();
  const area = (searchParams.get("area") || "").toLowerCase().trim();
  const san = searchParams.get("san") === "true";

  let results = mockDb.lawyers.filter((lw) => {
    if (state && state !== "all" && !lw.state.toLowerCase().includes(state)) return false;
    if (san && !lw.is_san) return false;
    if (area && area !== "all") {
      const hasArea = lw.practice_areas.some((pa) =>
        pa.toLowerCase().includes(area) || area.includes(pa.toLowerCase())
      );
      if (!hasArea) return false;
    }
    if (q) {
      const matchName = lw.full_name.toLowerCase().includes(q);
      const matchState = lw.state.toLowerCase().includes(q);
      const matchArea = lw.practice_areas.some((pa) =>
        pa.toLowerCase().includes(q) || q.includes(pa.toLowerCase())
      );
      return matchName || matchState || matchArea;
    }
    return true;
  });

  return NextResponse.json(results);
}
