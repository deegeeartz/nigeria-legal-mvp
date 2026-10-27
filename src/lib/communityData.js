// Rich Community Data Store for Wigally Social Legal Experience

export const COMMUNITY_POLLS = [
  {
    id: "poll_001",
    question: "Can a landlord legally demand rent payment in US Dollars in Lagos State?",
    category: "Property & Tenancy",
    created_at: "Active this week",
    total_votes: 289,
    options: [
      { id: "opt_1", text: "No, Naira is mandatory legal tender (CBN Act)", votes: 198, percentage: 69 },
      { id: "opt_2", text: "Yes, if agreed in tenancy agreement", votes: 62, percentage: 21 },
      { id: "opt_3", text: "Only in designated diplomatic zones", votes: 29, percentage: 10 }
    ],
    lawyer_verdict: {
      lawyer_name: "Barr. Amaka Okonkwo",
      title: "Commercial & Tenancy Counsel",
      badge: "NBA Verified",
      verdict_summary: "Under Section 20(5) of the Central Bank of Nigeria (CBN) Act 2007, refusing to accept the Naira as legal tender is an offence punishable by fine or imprisonment. Mandating dollar payment for domestic tenancy within Nigeria is legally impermissible."
    }
  },
  {
    id: "poll_002",
    question: "Can an employer read personal WhatsApp or iMessage on a company laptop?",
    category: "Employment & Data Privacy",
    created_at: "Active this week",
    total_votes: 184,
    options: [
      { id: "opt_1", text: "No without explicit written consent & NDPA compliance", votes: 122, percentage: 66 },
      { id: "opt_2", text: "Yes, employer owns laptop hardware & Wi-Fi", votes: 48, percentage: 26 },
      { id: "opt_3", text: "Only during contracted work hours", votes: 14, percentage: 8 }
    ],
    lawyer_verdict: {
      lawyer_name: "Ibrahim Yusuf SAN",
      title: "Senior Advocate & Civil Rights Counsel",
      badge: "Senior Silk",
      verdict_summary: "Section 37 of the 1999 Constitution and the Nigeria Data Protection Act (NDPA) 2023 preserve individual privacy. Device ownership does not grant unilateral rights to intercept encrypted personal communication without lawful grounds."
    }
  }
];

export const LIVE_AMAS = [
  {
    id: "ama_001",
    title: "Startup Equity, NDAs & CAC Common Mistakes with Barr. Amaka",
    host: {
      name: "Barr. Amaka Okonkwo",
      title: "Corporate & Tech Lawyer • 8 Yrs Call",
      avatar_initials: "AO",
      rating: "4.8 ★",
      verified: true
    },
    topic: "Vesting schedules, CAC post-incorporation filings, and resolving dead equity",
    status: "live", // "live" | "scheduled" | "concluded"
    listeners_count: 54,
    lawyers_in_room: 4,
    current_question: "What happens if a co-founder leaves 3 months after CAC registration?",
    answers_count: 12,
    badge: "🔴 LIVE LOUNGE"
  },
  {
    id: "ama_002",
    title: "Police Checkpoints & Section 37: Practical Citizen Rights",
    host: {
      name: "Ibrahim Yusuf SAN",
      title: "Senior Advocate of Nigeria",
      avatar_initials: "IY",
      rating: "4.9 ★",
      verified: true
    },
    topic: "Phone searches, road checkpoints, and fundamental enforcement remedies",
    status: "scheduled",
    scheduled_time: "Tomorrow @ 5:00 PM WAT",
    listeners_count: 142,
    lawyers_in_room: 6,
    badge: "🗓️ UPCOMING AMA"
  }
];

export const DAILY_QUICK_TAKES = [
  {
    id: "qt_001",
    date: "Today's Quick Take",
    category: "Tenancy & Housing",
    badge: "Tenant Shield",
    headline: "The 7-Day Quit Notice Fallacy",
    hook: "Landlord sent you 7 days to pack out? Here is why it's usually legally defective.",
    legal_truth: "Under Lagos State Tenancy Law 2011 (Section 13) and national Recovery of Premises Acts: Yearly tenants are entitled to 6 full months notice to quit; Half-yearly tenants get 3 months; Monthly tenants get 1 month. A 7-day notice is ONLY lawful for weekly tenancies or as a separate 'Notice of Owner's Intention to Apply to Court' AFTER the 6-month period has expired!",
    actionable_step: "Never panic or surrender keys on a 7-day notice. Formally reply via registered mail or email requesting statutory 6-month notice citing Section 13.",
    citation: "Lagos Tenancy Law 2011, Sec 13; Section 7 Recovery of Premises Act"
  },
  {
    id: "qt_002",
    date: "Contracts & Freelance",
    category: "Freelance Rights",
    badge: "Contract Armor",
    headline: "The Deemed Acceptance Clause",
    hook: "Stop clients from stalling invoice payments with endless minor revision loops.",
    legal_truth: "A contract without an acceptance deadline leaves your payment open to indefinite limbo. A 'Deemed Acceptance' clause legally establishes that deliverables not rejected with written specifics within 5 business days are formally accepted and invoiced.",
    actionable_step: "Add this 1 sentence to contracts: 'Deliverables shall be deemed accepted if client does not provide written, specific objections within 5 business days of delivery.'",
    citation: "Principles of Nigerian Commercial Law & Common Law Precedents"
  },
  {
    id: "qt_003",
    date: "Digital & FinTech",
    category: "Cyberlaw",
    badge: "Privacy Alert",
    headline: "Loan App Defamation is Illegal",
    hook: "Digital lenders texting your contact list about loan default commit criminal and NDPA violations.",
    legal_truth: "FCCPC regulations and the Nigeria Data Protection Act 2023 classify broadcasting contact list messages or shaming borrower contacts as unlawful processing of personal data, punishable with severe penalties.",
    actionable_step: "Take clear screenshots of defamatory texts and file an expedited complaint with the FCCPC portal and NDPC.",
    citation: "FCCPC Digital Lending Guidelines; Section 48 NDPA 2023"
  }
];

export const LEGAL_PLAYBOOKS = [
  {
    id: "pb_freelancer",
    title: "The Freelancer Non-Payment Recovery Kit",
    badge: "Finance & Contracts",
    difficulty: "Actionable in 48 Hours",
    read_time: "4 min read",
    summary: "Clear, field-tested procedure to recover overdue client fees in Nigeria without high litigation expenses.",
    icon: "FileCheck2",
    accent: "amber",
    steps: [
      { id: "s1", title: "Compile Document Trail", desc: "Gather signed agreement, WhatsApp messages, delivery receipts, and invoices into a single PDF chronology." },
      { id: "s2", title: "Issue Formal Final Demand Letter", desc: "Issue a 7-day formal notice specifying breach, citing agreed payment milestones, and announcing immediate escalation." },
      { id: "s3", title: "File at Lagos Multi-Door Courthouse (LMDC)", desc: "Submit an ADR claim for quick mediation; over 70% of business debts settle in the first mediation session." },
      { id: "s4", title: "Summary Judgment on Liquidated Demand", desc: "Instruct counsel to file an undefended list lawsuit where court grants judgment without full multi-year trial." }
    ],
    sample_clause: "All fees are strictly due within 14 calendar days of milestone delivery. Invoices outstanding past 30 days accrue standard interest at 2.5% per month."
  },
  {
    id: "pb_tenant",
    title: "Tenant Eviction Defense & Lockout Protocol",
    badge: "Tenancy & Housing",
    difficulty: "Essential Legal Armor",
    read_time: "5 min read",
    summary: "How to legally neutralize arbitrary 100% rent spikes, landlord harassment, and forceful self-help evictions.",
    icon: "ShieldAlert",
    accent: "emerald",
    steps: [
      { id: "s1", title: "Preserve Proof of Possession", desc: "Keep utility receipts, tenancy agreement, and bank transfer receipts confirming ongoing lawful occupancy." },
      { id: "s2", title: "Self-Help Eviction is a Criminal Act", desc: "Padlocking gates, removing roofs, or turning off water is prohibited under Section 44 Lagos Tenancy Law. Document immediately with timestamped video." },
      { id: "s3", title: "Enforce Statutory Notice Periods", desc: "Ensure your landlord served a full 6-month Notice to Quit followed by the separate 7-day Owner's Intention to Apply to Court." },
      { id: "s4", title: "Petition the Citizens Mediation Centre (CMC)", desc: "Free state mediation service where landlords cannot bring unlawful force and reasonable rent schedules are agreed." }
    ],
    sample_clause: "Neither party shall resort to self-help eviction, disconnection of utilities, or physical interference without a valid court judgment."
  },
  {
    id: "pb_startup",
    title: "Co-Founder Equity & IP Protection Blueprint",
    badge: "Startups & CAC",
    difficulty: "Pre-Incorporation",
    read_time: "6 min read",
    summary: "Protect your startup from departed co-founders holding 40% dead equity before your first seed round.",
    icon: "Briefcase",
    accent: "stone",
    steps: [
      { id: "s1", title: "Implement 4-Year Vesting with 1-Year Cliff", desc: "No founder owns 100% of their equity immediately. If someone leaves in month 6, they leave with 0%." },
      { id: "s2", title: "Sign Intellectual Property Assignment Deed", desc: "The software repository, code, and logo must belong directly to the CAC company, not an individual founder." },
      { id: "s3", title: "Add Drag-Along & Tag-Along Terms", desc: "Prevent a minority shareholder from blocking a major acquisition or financing round." },
      { id: "s4", title: "Document Seed Loan vs Equity Agreements", desc: "Clearly delineate money contributed by founders as either SAFE, equity purchase, or shareholder loan." }
    ],
    sample_clause: "Founder shares shall vest 25% on the first anniversary of commencement, and the remaining 75% in equal monthly increments over the following 36 months."
  }
];

export const REACTION_TYPES = [
  { key: "sound", label: "Legally Sound", emoji: "⚖️", color: "hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300" },
  { key: "lifesaver", label: "Life Saver", emoji: "💡", color: "hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300" },
  { key: "clarify", label: "Need Clarity", emoji: "🔍", color: "hover:bg-blue-50 hover:text-blue-800 hover:border-blue-300" },
  { key: "debate", label: "Hot Debate", emoji: "🔥", color: "hover:bg-rose-50 hover:text-rose-800 hover:border-rose-300" }
];
