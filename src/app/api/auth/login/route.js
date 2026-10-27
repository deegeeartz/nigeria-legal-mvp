import { NextResponse } from "next/server";
import { mockDb, USERS } from "@/lib/mockDb";

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password } = body;
    const input = email?.toLowerCase().trim() || "";

    const matchedUser = USERS.find((u) => 
      u.email.toLowerCase() === input ||
      u.full_name.toLowerCase().includes(input) ||
      u.email.split("@")[0].toLowerCase() === input
    ) || USERS.find((u) => u.role === body.role) || USERS[0];

    mockDb.currentUser = matchedUser;

    return NextResponse.json({
      user_id: matchedUser.user_id,
      email: matchedUser.email,
      full_name: matchedUser.full_name,
      role: matchedUser.role,
      lawyer_id: matchedUser.lawyer_id
    });
  } catch (err) {
    return NextResponse.json({ error: "Invalid login payload" }, { status: 400 });
  }
}

