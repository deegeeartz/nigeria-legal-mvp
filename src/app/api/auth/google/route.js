import { NextResponse } from "next/server";
import { mockDb, USERS, SEED_LAWYERS } from "@/lib/mockDb";

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, full_name, role = "client", avatar_url } = body;

    if (!email) {
      return NextResponse.json({ error: "Google email is required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    let matchedUser = USERS.find((u) => u.email.toLowerCase() === normalizedEmail);

    if (matchedUser) {
      // If user exists, optionally update role if user switched intentionally
      if (role && matchedUser.role !== role) {
        matchedUser.role = role;
        if (role === "lawyer" && !matchedUser.lawyer_id) {
          matchedUser.lawyer_id = `lw_${String(matchedUser.user_id).padStart(3, "0")}`;
        }
      }
      matchedUser.auth_provider = "google";
      if (avatar_url) matchedUser.avatar_url = avatar_url;
      if (full_name && !matchedUser.full_name) matchedUser.full_name = full_name;

      // If lawyer, ensure they exist in mockDb.lawyers
      if (matchedUser.role === "lawyer" && matchedUser.lawyer_id) {
        const existingLawyer = mockDb.lawyers?.find((l) => l.lawyer_id === matchedUser.lawyer_id);
        if (!existingLawyer) {
          const newLawyerProfile = {
            lawyer_id: matchedUser.lawyer_id,
            full_name: matchedUser.full_name,
            state: "Lagos",
            practice_areas: ["corporate", "contracts", "employment"],
            years_called: 6,
            nin_verified: true,
            nba_verified: true,
            bvn_verified: true,
            profile_completeness: 88,
            completed_matters: 4,
            rating: 4.9,
            response_rate: 98,
            avg_response_hours: 1.5,
            repeat_client_rate: 35,
            base_consult_fee_ngn: 35000,
            price_ngn: 35000,
            active_complaints: 0,
            tier: "Verified_Counsel",
            score: 91.0,
            badges: ["NBA Verified", "Google Verified Counsel"],
            why_recommended: [{ label: "Specialty", value: "Commercial & Tech Law" }],
          };
          if (!mockDb.lawyers) mockDb.lawyers = [...SEED_LAWYERS];
          mockDb.lawyers.unshift(newLawyerProfile);
        }
      }

      mockDb.currentUser = matchedUser;
      return NextResponse.json(matchedUser);
    }

    // New Google Sign-Up
    const newUserId = USERS.length + 1;
    const isLawyer = role === "lawyer";
    const lawyerId = isLawyer ? `lw_${String(newUserId).padStart(3, "0")}` : null;

    const newUser = {
      user_id: newUserId,
      email: normalizedEmail,
      full_name: full_name || normalizedEmail.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      role: isLawyer ? "lawyer" : "client",
      lawyer_id: lawyerId,
      avatar_url: avatar_url || null,
      auth_provider: "google",
      created_at: new Date().toISOString(),
    };

    USERS.push(newUser);

    if (isLawyer) {
      const newLawyerProfile = {
        lawyer_id: lawyerId,
        full_name: newUser.full_name,
        state: "Lagos",
        practice_areas: ["corporate", "contracts", "dispute_resolution"],
        years_called: 5,
        nin_verified: true,
        nba_verified: true,
        bvn_verified: true,
        profile_completeness: 85,
        completed_matters: 0,
        rating: 5.0,
        response_rate: 100,
        avg_response_hours: 1.0,
        repeat_client_rate: 0,
        base_consult_fee_ngn: 35000,
        price_ngn: 35000,
        active_complaints: 0,
        court_admissions: ["state_high_court", "federal_high_court"],
        legal_system: "common_law",
        tier: "Verified_Counsel",
        score: 90.0,
        badges: ["NBA Verified", "Google Verified Counsel"],
        why_recommended: [{ label: "Specialty", value: "General Legal Advisory" }],
      };

      if (!mockDb.lawyers) mockDb.lawyers = [...SEED_LAWYERS];
      mockDb.lawyers.unshift(newLawyerProfile);
    }

    mockDb.currentUser = newUser;

    return NextResponse.json(newUser, { status: 201 });
  } catch (err) {
    console.error("Google Auth error:", err);
    return NextResponse.json({ error: "Failed to process Google authentication" }, { status: 500 });
  }
}
