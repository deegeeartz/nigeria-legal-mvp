import { NextResponse } from "next/server";
import { mockDb } from "@/lib/mockDb";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const query = (body.summary || body.q || "").toLowerCase().trim();
    const stateFilter = (body.state || "").toLowerCase().trim();
    const areaFilter = (body.practice_area || body.area || "").toLowerCase().trim();
    const sanOnly = Boolean(body.is_san || body.san);

    let matches = mockDb.lawyers.filter((lw) => {
      // State filtering
      if (stateFilter && stateFilter !== "all") {
        if (!lw.state.toLowerCase().includes(stateFilter)) return false;
      }
      // SAN filtering
      if (sanOnly && !lw.is_san) {
        return false;
      }
      // Practice area filtering
      if (areaFilter && areaFilter !== "all") {
        const matchesArea = lw.practice_areas.some((pa) =>
          pa.toLowerCase().includes(areaFilter) || areaFilter.includes(pa.toLowerCase())
        );
        if (!matchesArea) return false;
      }
      // Query filtering
      if (query && query !== "legal counsel") {
        const matchesName = lw.full_name.toLowerCase().includes(query);
        const matchesState = lw.state.toLowerCase().includes(query);
        const matchesArea = lw.practice_areas.some((pa) =>
          pa.toLowerCase().includes(query) || query.includes(pa.toLowerCase())
        );
        const matchesTier = (lw.tier || "").toLowerCase().includes(query);
        return matchesName || matchesState || matchesArea || matchesTier;
      }
      return true;
    });

    return NextResponse.json({ matches });
  } catch (err) {
    return NextResponse.json({ matches: mockDb.lawyers });
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").toLowerCase().trim();
  const state = (searchParams.get("state") || "").toLowerCase().trim();
  const area = (searchParams.get("area") || "").toLowerCase().trim();
  const san = searchParams.get("san") === "true";

  let matches = mockDb.lawyers.filter((lw) => {
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

  return NextResponse.json({ matches });
}
