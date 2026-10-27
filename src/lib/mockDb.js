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
      video_status: "on_hold",
      channel: "secure_case_chat_and_documents"
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
  practiceSeals: {},
  communityQuestions: [
    {
      id: "q_001",
      title: "Can a Lagos landlord give 7 days notice to quit on an annual tenancy?",
      body: "I have rented an apartment in Gbagada, Lagos for 3 years paying rent annually. My current term runs until October, but my landlord's caretaker served a 7-day notice to quit claiming they want to renovate the building. Can they legally evict me without the 6-month statutory notice?",
      category: "Property & Tenancy",
      author_name: "Anonymous Tenant in Gbagada",
      is_anonymous: true,
      author_role: "client",
      author_id: 1,
      user_handle: "@gbagada_tenant",
      created_at: "2 hours ago",
      timestamp: Date.now() - 7200000,
      upvotes: 38,
      tags: ["LagosTenancyLaw", "NoticeToQuit", "RecoveryOfPremises"],
      answers: [
        {
          id: "ans_001",
          lawyer_id: "lw_001",
          lawyer_name: "Barr. Amaka Okonkwo",
          lawyer_title: "Commercial & Property Counsel • 8 Yrs Call",
          is_san: false,
          is_verified_lawyer: true,
          nba_branch: "Lagos Branch",
          upvotes: 27,
          created_at: "1 hour ago",
          body: "Under Section 13(1) of the Tenancy Law of Lagos State 2011, for a yearly tenancy where no contrary notice period was agreed in writing, the statutory notice to quit is 6 calendar months.\n\nEven after a valid notice to quit expires, the landlord cannot use force. They must issue a 7-day 'Notice of Owner's Intention to Apply to Court to Recover Possession' and obtain a warrant of possession from the Magistrate Court. Self-help eviction is a criminal offense under Section 44.",
          deliberations: [
            {
              id: "delib_001",
              lawyer_id: "lw_002",
              lawyer_name: "Ibrahim Yusuf SAN",
              lawyer_title: "Senior Advocate of Nigeria",
              is_san: true,
              nba_branch: "Abuja / Lagos",
              comment: "I concur with Learned Colleague Barr. Okonkwo. However, always review your initial lease agreement. If there was an express covenant waiving or contracting out of the 6-month notice, the Supreme Court in African Petroleum Ltd v. Owodunni (1991) established that party autonomy governs. Check if you signed a clause stipulating shorter notice.",
              created_at: "45 mins ago",
              upvotes: 19
            },
            {
              id: "delib_002",
              lawyer_id: "lw_005",
              lawyer_name: "Kemi Adegoke SAN",
              lawyer_title: "Senior Advocate of Nigeria",
              is_san: true,
              nba_branch: "Lagos Branch",
              comment: "Learned Silk makes a vital caveat. Also note: intending to 'renovate' does not constitute an urgent nuisance or structural hazard under Section 25 unless certified by the Lagos State Building Control Agency (LASBCA). Keep proof of your rent receipts.",
              created_at: "20 mins ago",
              upvotes: 12
            }
          ]
        }
      ]
    },
    {
      id: "q_002",
      title: "Co-founder left our Nigerian tech startup: can we claw back unvested shares?",
      body: "We incorporated our fintech company with CAC in 2024. One of the co-founders stopped working after 4 months and moved to Canada. They currently hold 30% on CAC Form CAC1.1. We had a verbal agreement for a 4-year vesting schedule with 1-year cliff, but didn't execute the formal Shareholders Agreement. How do we protect the startup from dead equity?",
      category: "Corporate & Tech",
      author_name: "Tunde Bakare",
      is_anonymous: false,
      author_role: "client",
      author_id: 1,
      user_handle: "@tundebakare",
      created_at: "5 hours ago",
      timestamp: Date.now() - 18000000,
      upvotes: 54,
      tags: ["CAMA2020", "StartupEquity", "ShareholdersAgreement", "CAC"],
      answers: [
        {
          id: "ans_002",
          lawyer_id: "lw_001",
          lawyer_name: "Barr. Amaka Okonkwo",
          lawyer_title: "Corporate & Commercial Law • 8 Yrs Call",
          is_san: false,
          is_verified_lawyer: true,
          nba_branch: "Lagos Branch",
          upvotes: 35,
          created_at: "3 hours ago",
          body: "Under Companies and Allied Matters Act (CAMA) 2020, once shares are allotted and registered with the Corporate Affairs Commission (CAC), the holder is legally a member of the company with proprietary rights under Section 138.\n\nA verbal vesting agreement is notoriously difficult to enforce against a registered title unless there is written documentary proof (emails, Slack messages, founder MOU) evidencing the condition precedent. Your immediate options are: 1) Negotiate a formal Share Buyback / Surrender Agreement; 2) Pass a special resolution for capital restructuring if permitted by your Articles of Association; or 3) Issue new shares / dilution pool for active contributors.",
          deliberations: [
            {
              id: "delib_003",
              lawyer_id: "lw_005",
              lawyer_name: "Kemi Adegoke SAN",
              lawyer_title: "Senior Advocate of Nigeria",
              is_san: true,
              nba_branch: "Lagos Branch",
              comment: "Counsel Okonkwo highlights the core CAMA obstacle. Let me caution against hasty dilution: if the departing founder challenges it under Section 343 for unfairly prejudicial conduct or minority oppression, you risk injunctions that freeze future venture funding. Engage a corporate mediator or counsel to draft a clean separation deed.",
              created_at: "2 hours ago",
              upvotes: 22
            }
          ]
        }
      ]
    },
    {
      id: "q_003",
      title: "Can police officers search my phone or bank apps at a checkpoint without a warrant?",
      body: "I was stopped along Lekki-Epe expressway and officers demanded I unlock my phone and open my cryptocurrency and banking applications. When I refused, they threatened to detain me. What are my constitutional protections and the exact legal sections I can cite respectfully?",
      category: "Constitutional & Civil Rights",
      author_name: "Anonymous Citizen in Lekki",
      is_anonymous: true,
      author_role: "client",
      author_id: 99,
      user_handle: "@lekki_driver",
      created_at: "1 day ago",
      timestamp: Date.now() - 86400000,
      upvotes: 89,
      tags: ["ConstitutionalRights", "PoliceStops", "Section37", "Privacy"],
      answers: [
        {
          id: "ans_003",
          lawyer_id: "lw_002",
          lawyer_name: "Ibrahim Yusuf SAN",
          lawyer_title: "Senior Advocate of Nigeria",
          is_san: true,
          nba_branch: "Abuja / Federal High Court",
          upvotes: 73,
          created_at: "22 hours ago",
          body: "No law enforcement officer in Nigeria has the legal authority to randomly search your mobile device or banking apps without a valid search warrant or reasonable suspicion connected to an ongoing investigation.\n\nKey authorities:\n1. Section 37 of the 1999 Constitution of Nigeria (as amended) guarantees your fundamental right to privacy of citizen telephone communications and correspondence.\n2. In Nnamdi Nwokocha v. IGP, the Federal High Court affirmed that searching a citizen's phone without a search warrant violates Section 37.\n3. The Inspector General of Police (IGP) has issued multiple operational directives reiterating that routine phone searching is an act of extortion and gross misconduct.",
          deliberations: [
            {
              id: "delib_004",
              lawyer_id: "lw_001",
              lawyer_name: "Barr. Amaka Okonkwo",
              lawyer_title: "Advocate • NBA Human Rights Committee",
              is_san: false,
              nba_branch: "Lagos Branch",
              comment: "Learned Silk is absolutely right. Practical safety tip: Remain polite, do not resist physically, state calmly: 'Officer, my phone contains private work and banking data protected under Section 37 of the 1999 Constitution and Nigeria Police regulations.' Request to proceed to the nearest police station if they insist, rather than complying in isolated locations.",
              created_at: "18 hours ago",
              upvotes: 41
            }
          ]
        }
      ]
    },
    {
      id: "q_004",
      title: "Employer terminated contract without 1-month notice or salary in lieu. Recourse?",
      body: "I worked as an operations manager for 2 years. My appointment letter stated either party could terminate by giving 1 month notice or 1 month gross salary in lieu. Management sent an instant email termination on Friday with zero notice and offered only prorated 10 days pay. Can I approach the National Industrial Court?",
      category: "Employment & Labour",
      author_name: "Funke Alabi",
      is_anonymous: false,
      author_role: "client",
      author_id: 102,
      user_handle: "@funke_operations",
      created_at: "2 days ago",
      timestamp: Date.now() - 172800000,
      upvotes: 31,
      tags: ["LabourAct", "NationalIndustrialCourt", "WrongfulTermination"],
      answers: [
        {
          id: "ans_004",
          lawyer_id: "lw_005",
          lawyer_name: "Kemi Adegoke SAN",
          lawyer_title: "Senior Advocate & Employment Law Specialist",
          is_san: true,
          nba_branch: "Lagos Branch",
          upvotes: 24,
          created_at: "1 day ago",
          body: "Yes, you have a solid cause of action for wrongful termination at the National Industrial Court of Nigeria (NICN) under Section 254C of the 1999 Constitution.\n\nIn Nigerian labour jurisprudence (Chukwumah v. Shell Petroleum Development Co.), where a contract provides for notice or payment in lieu, the payment in lieu must be made contemporaneously (at the exact moment) the termination letter is handed over. If they terminated you instantly without contemporaneous payment, the termination is wrongful. You are entitled to 1 month full gross salary in lieu of notice, plus any accrued leave allowance and pension remittances.",
          deliberations: []
        }
      ]
    }
  ]
};

export const mockDb = globalThis.__MOCK_DB__;
