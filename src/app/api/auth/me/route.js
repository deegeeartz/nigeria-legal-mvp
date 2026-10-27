import { NextResponse } from "next/server";
import { mockDb, USERS } from "@/lib/mockDb";

export async function GET(request) {
  const user = mockDb.currentUser || USERS[0];
  return NextResponse.json(user);
}

export async function PATCH(request) {
  try {
    const data = await request.json();
    const currentUser = mockDb.currentUser || USERS[0];

    if (data.avatar_url !== undefined) {
      currentUser.avatar_url = data.avatar_url;
    }
    if (data.full_name !== undefined && data.full_name.trim()) {
      currentUser.full_name = data.full_name.trim();
    }

    // Sync across USERS array
    const matchedUser = USERS.find((u) => u.email === currentUser.email);
    if (matchedUser) {
      if (data.avatar_url !== undefined) matchedUser.avatar_url = data.avatar_url;
      if (data.full_name !== undefined && data.full_name.trim()) matchedUser.full_name = data.full_name.trim();
    }

    // If lawyer, sync lawyer avatar
    if (currentUser.lawyer_id) {
      const matchedLawyer = mockDb.lawyers.find((lw) => lw.lawyer_id === currentUser.lawyer_id);
      if (matchedLawyer && data.avatar_url !== undefined) {
        matchedLawyer.avatar_url = data.avatar_url;
      }
    }

    return NextResponse.json(currentUser);
  } catch (err) {
    return NextResponse.json({ error: "Failed to update profile", details: String(err) }, { status: 400 });
  }
}

export async function POST(request) {
  return PATCH(request);
}
