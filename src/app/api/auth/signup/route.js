import { NextResponse } from "next/server";
import { mockDb, USERS } from "@/lib/mockDb";

export async function POST(request) {
  try {
    const body = await request.json();
    const newUser = {
      user_id: USERS.length + 1,
      email: body.email || `user${USERS.length + 1}@example.com`,
      full_name: body.full_name || "New User",
      role: body.role || "client",
      lawyer_id: body.role === "lawyer" ? `lw_00${USERS.length + 1}` : null
    };
    USERS.push(newUser);
    mockDb.currentUser = newUser;

    return NextResponse.json(newUser, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Signup error" }, { status: 400 });
  }
}
