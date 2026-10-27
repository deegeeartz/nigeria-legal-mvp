// In-memory data store for Wigally Legal Platform

export const SEED_LAWYERS = [
  {
    lawyer_id: "lw_001",
    full_name: "Amaka Okonkwo",
    state: "Lagos",
    practice_areas: ["employment", "contracts"],
    years_called: 8,
    nin_verified: true,
    nba_verified: true,
    bvn_verified: true,
    profile_completeness: 92,
    completed_matters: 37,
    rating: 4.8,
    response_rate: 96,
    avg_response_hours: 1.8,
    repeat_client_rate: 41,
    base_consult_fee_ngn: 45000,
    price_ngn: 45000,
    active_complaints: 0,
    court_admissions: ["state_high_court", "national_industrial"],
    legal_system: "common_law",
    pro_bono_practice_areas: ["employment"],
    latitude: 6.5244,
    longitude: 3.3792,
    knowledge_contribution_score: 45.0,
    tier: "Top_Tier",
    score: 94.5,
    badges: ["NBA Verified", "Seal & Stamp Valid"],
    why_recommended: [{ label: "Specialty", value: "Employment Law" }, { label: "Rating", value: "4.8 ★" }]
  },
  {
    lawyer_id: "lw_002",
    full_name: "Ibrahim Yusuf SAN",
    state: "Abuja",
    practice_areas: ["property", "litigation"],
    years_called: 14,
    nin_verified: true,
    nba_verified: true,
    bvn_verified: true,
    profile_completeness: 88,
    completed_matters: 52,
    rating: 4.7,
    response_rate: 93,
    avg_response_hours: 3.5,
    repeat_client_rate: 34,
    base_consult_fee_ngn: 60000,
    price_ngn: 60000,
    active_complaints: 0,
    is_san: true,
    court_admissions: ["federal_high_court", "state_high_court", "court_of_appeal", "sharia"],
    legal_system: "common_law",
    pro_bono_practice_areas: ["contracts"],
    latitude: 9.0765,
    longitude: 7.3986,
    knowledge_contribution_score: 80.0,
    tier: "Senior_Advocate",
    score: 96.0,
    badges: ["NBA Verified", "Senior Advocate"],
    why_recommended: [{ label: "Specialty", value: "Property & Litigation" }, { label: "Experience", value: "14 Years" }]
  },
  {
    lawyer_id: "lw_003",
    full_name: "Chioma Eze",
    state: "Lagos",
    practice_areas: ["family", "property"],
    years_called: 6,
    nin_verified: true,
    nba_verified: true,
    bvn_verified: true,
    profile_completeness: 79,
    completed_matters: 12,
    rating: 4.5,
    response_rate: 90,
    avg_response_hours: 5.0,
    repeat_client_rate: 22,
    base_consult_fee_ngn: 30000,
    price_ngn: 30000,
    active_complaints: 0,
    court_admissions: ["state_high_court", "customary"],
    legal_system: "common_law",
    pro_bono_practice_areas: ["family"],
    latitude: 6.5833,
    longitude: 3.3333,
    knowledge_contribution_score: 20.0,
    tier: "Verified_Counsel",
    score: 88.0,
    badges: ["NBA Verified"],
    why_recommended: [{ label: "Specialty", value: "Family & Property" }]
  },
  {
    lawyer_id: "lw_004",
    full_name: "Sadiq Bello",
    state: "Lagos",
    practice_areas: ["property", "land_dispute"],
    years_called: 3,
    nin_verified: true,
    nba_verified: true,
    bvn_verified: false,
    profile_completeness: 75,
    completed_matters: 3,
    rating: 4.4,
    response_rate: 88,
    avg_response_hours: 6.0,
    repeat_client_rate: 10,
    base_consult_fee_ngn: 20000,
    price_ngn: 20000,
    active_complaints: 0,
    tier: "Junior_Counsel",
    score: 82.0,
    badges: ["NBA Verified"],
    why_recommended: [{ label: "Specialty", value: "Land Disputes" }]
  },
  {
    lawyer_id: "lw_005",
    full_name: "Kemi Adegoke SAN",
    state: "Lagos",
    practice_areas: ["employment", "labour"],
    years_called: 11,
    nin_verified: true,
    nba_verified: true,
    bvn_verified: true,
    profile_completeness: 97,
    completed_matters: 71,
    rating: 4.9,
    response_rate: 98,
    avg_response_hours: 1.2,
    repeat_client_rate: 52,
    base_consult_fee_ngn: 70000,
    price_ngn: 70000,
    active_complaints: 0,
    is_san: true,
    court_admissions: ["federal_high_court", "state_high_court", "national_industrial", "court_of_appeal"],
    legal_system: "common_law",
    tier: "Senior_Advocate",
    score: 98.0,
    badges: ["NBA Verified", "Senior Advocate", "Seal & Stamp Valid"],
    why_recommended: [{ label: "Rating", value: "4.9 ★" }, { label: "Response", value: "< 2 hours" }]
  }
];

export const USERS = [
  {
    user_id: 1,
    email: "client@example.com",
    full_name: "Tunde Bakare",
    role: "client",
    lawyer_id: null
  },
  {
    user_id: 2,
    email: "amaka@example.com",
    full_name: "Amaka Okonkwo",
    role: "lawyer",
    lawyer_id: "lw_001"
  },
  {
    user_id: 3,
    email: "admin@example.com",
    full_name: "System Admin",
    role: "admin",
    lawyer_id: null
  }
];

// In-memory collections
globalThis.__MOCK_DB__ = globalThis.__MOCK_DB__ || {
  currentUser: USERS[0],
  lawyers: [...SEED_LAWYERS],
  consultations: [
    {
      consultation_id: 101,
      client_id: 1,
      lawyer_id: "lw_001",
      scheduled_for: "2026-08-05T10:00:00Z",
      summary: "Review commercial property lease agreement in Lekki Phase 1",
      status: "booked",
      created_on: "2026-07-30T14:20:00Z",
      video_room_url: "https://meet.jit.si/NigeriaLegalConsultation_101"
    }
  ],
  documents: [
    {
      document_id: "doc_001",
      consultation_id: 101,
      document_label: "Draft Lease Agreement",
      original_filename: "Lekki_Property_Lease_Draft.pdf",
      content_type: "application/pdf",
      uploaded_at: "2026-07-30T15:00:00Z"
    }
  ],
  milestones: [
    {
      id: "ms_001",
      consultation_id: 101,
      event_name: "Consultation Booked",
      description: "Client booked initial consultation and paid escrow fee",
      created_on: "2026-07-30T14:20:00Z"
    }
  ],
  notes: [
    {
      id: "note_001",
      consultation_id: 101,
      author_user_id: 2,
      body: "Initial review conducted. Term sheet requires clarification on maintenance clauses.",
      is_private: false,
      created_on: "2026-07-30T16:00:00Z"
    }
  ],
  conversations: [
    {
      conversation_id: 1,
      client_user_id: 1,
      lawyer_id: "lw_001",
      created_on: "2026-07-30T14:20:00Z"
    }
  ],
  messages: [
    {
      id: 1,
      message_id: 1,
      conversation_id: 1,
      sender_user_id: 1,
      body: "Hello Barrister Amaka, I uploaded the lease draft for your review.",
      created_on: "2026-07-30T14:25:00Z"
    },
    {
      id: 2,
      message_id: 2,
      conversation_id: 1,
      sender_user_id: 2,
      body: "Thank you Tunde! I have received it and will look over it before our scheduled session.",
      created_on: "2026-07-30T14:30:00Z"
    }
  ],
  notifications: [
    {
      notification_id: 1,
      user_id: 1,
      title: "Consultation Confirmed",
      body: "Your consultation with Barrister Amaka Okonkwo is set for Aug 5, 2026.",
      is_read: false,
      created_on: "2026-07-30T14:20:00Z"
    }
  ],
  auditEvents: [
    {
      audit_event_id: 1,
      action: "consultation.booked",
      detail: "Consultation #101 booked with lawyer lw_001",
      resource_type: "consultation",
      resource_id: "101",
      actor_user_id: 1,
      created_on: "2026-07-30T14:20:00Z"
    }
  ],
  kycPending: [
    {
      lawyer_id: "lw_004",
      full_name: "Sadiq Bello",
      enrollment_number: "SCN089421",
      nin_verified: true,
      verification_document_id: "doc_kyc_004"
    }
  ],
  practiceSeals: {}
};

export const mockDb = globalThis.__MOCK_DB__;
