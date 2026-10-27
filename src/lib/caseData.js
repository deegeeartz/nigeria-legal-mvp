// Case Management Data Model for Wigally Legal Platform

export const INITIAL_CASES = [
  {
    id: "case_001",
    lawyer_id: "lw_001",
    suit_number: "FHC/L/CS/891/2026",
    title: "FinTech Synergy Ltd v. Central Bank of Nigeria & Anor",
    client_name: "FinTech Synergy Ltd (MD: Dayo Adeleke)",
    client_phone: "+234 803 555 0192",
    client_email: "dayo@fintechsynergy.ng",
    court: "Federal High Court, Lagos Judicial Division (Court 3)",
    presiding_judge: "Hon. Justice A. B. Mohammed",
    practice_area: "FinTech & Banking Regulation",
    stage: "Written Addresses",
    priority: "High",
    filing_date: "2026-02-14",
    next_court_date: "2026-08-18",
    next_action: "Adoption of Final Written Addresses on Regulatory Sandbox Guidelines",
    retainer_agreed_ngn: 2500000,
    retainer_paid_ngn: 1800000,
    escrow_status: "Rule 10 Escrow Confirmed",
    tasks: [
      { id: "t_1", text: "File Originating Summons and Affidavit of Urgency", done: true, due_date: "2026-02-14" },
      { id: "t_2", text: "Serve Counter-Affidavit on Central Bank Legal Counsel", done: true, due_date: "2026-04-10" },
      { id: "t_3", text: "File Reply on Point of Law and Table of Authorities", done: false, due_date: "2026-08-10" },
      { id: "t_4", text: "Prepare 4-bundle bench binder for Judge's Chamber", done: false, due_date: "2026-08-15" }
    ],
    notes: [
      {
        id: "n_1",
        author: "Amaka Okonkwo",
        date: "2026-06-22",
        text: "Appeared before Justice Mohammed. Opposing counsel requested 7 days extension of time to regularize counter-affidavit. Granted with cost of ₦50,000 against Defendants. Adjourned to Aug 18 for adoption."
      },
      {
        id: "n_2",
        author: "Amaka Okonkwo",
        date: "2026-07-15",
        text: "Client supplied amended CBN Payment System circular dated June 2026. Relevant to establish ultra vires arguments."
      }
    ]
  },
  {
    id: "case_002",
    lawyer_id: "lw_001",
    suit_number: "NICN/LA/2026/042",
    title: "Dr. Oluwaseun Davies v. Zenith Oilfield Engineering Ltd",
    client_name: "Dr. Oluwaseun Davies",
    client_phone: "+234 812 400 3391",
    client_email: "seun.davies@gmail.com",
    court: "National Industrial Court of Nigeria, Ikoyi Division",
    presiding_judge: "Hon. Justice N. C. Agbakoba",
    practice_area: "Labour & Employment Law",
    stage: "Trial / Cross-Examination",
    priority: "Urgent",
    filing_date: "2026-01-20",
    next_court_date: "2026-08-12",
    next_action: "Continuation of Cross-Examination of CW1 (Claimant)",
    retainer_agreed_ngn: 1400000,
    retainer_paid_ngn: 950000,
    escrow_status: "Milestone 2 Verified",
    tasks: [
      { id: "t_5", text: "File General Form of Complaint & Statement of Facts", done: true, due_date: "2026-01-20" },
      { id: "t_6", text: "Serve Subpoena Duces Tecum on Pension Fund Administrator", done: true, due_date: "2026-05-18" },
      { id: "t_7", text: "Prepare Claimant for cross-examination on severance clauses", done: false, due_date: "2026-08-10" },
      { id: "t_8", text: "Review opposing witness statement of HR Director", done: false, due_date: "2026-08-11" }
    ],
    notes: [
      {
        id: "n_3",
        author: "Amaka Okonkwo",
        date: "2026-07-04",
        text: "Claimant testified in chief. Admitted Exhibits C1 to C12 without objection. Cross-examination commenced by defence counsel; adjourned to Aug 12."
      }
    ]
  },
  {
    id: "case_003",
    lawyer_id: "lw_001",
    suit_number: "LD/2045/GCM/2025",
    title: "Alhaji Musa Garba v. Sterling Real Estate Ventures",
    client_name: "Alhaji Musa Garba",
    client_phone: "+234 802 888 7711",
    client_email: "musa.garba@kassimholdings.ng",
    court: "Lagos State High Court, Commercial Division, TBS",
    presiding_judge: "Hon. Justice K. O. Alabi",
    practice_area: "Commercial Property & Land Title",
    stage: "Settlement Negotiation / ADR",
    priority: "Medium",
    filing_date: "2025-11-18",
    next_court_date: "2026-08-26",
    next_action: "Report of Terms of Settlement before Lagos Multi-Door Courthouse",
    retainer_agreed_ngn: 1750000,
    retainer_paid_ngn: 1750000,
    escrow_status: "Fully Paid",
    tasks: [
      { id: "t_9", text: "Conduct Lands Bureau beacon search at Alausa", done: true, due_date: "2025-11-25" },
      { id: "t_10", text: "Attend mediation session at LMDC", done: true, due_date: "2026-06-14" },
      { id: "t_11", text: "Draft Terms of Settlement for adoption as Consent Judgment", done: false, due_date: "2026-08-20" },
      { id: "t_12", text: "Secure certified survey plan endorsement from Surveyor General", done: false, due_date: "2026-08-22" }
    ],
    notes: [
      {
        id: "n_4",
        author: "Amaka Okonkwo",
        date: "2026-07-18",
        text: "Defendant agreed to refund ₦45,000,000 or reallocate two 600sqm plots in Sangotedo scheme. Drafting settlement terms to safeguard client title."
      }
    ]
  },
  {
    id: "case_004",
    lawyer_id: "lw_001",
    suit_number: "CA/L/PRE/2026/112",
    title: "Apex Logistics Consortium v. Corporate Affairs Commission",
    client_name: "Apex Logistics Ltd",
    client_phone: "+234 809 111 2233",
    client_email: "legal@apexlogistics.com",
    court: "Court of Appeal, Lagos Division",
    presiding_judge: "Hon. Justice M. L. Garba, JCA (Presiding)",
    practice_area: "Corporate & Appellate Practice",
    stage: "Awaiting Judgment",
    priority: "High",
    filing_date: "2026-03-02",
    next_court_date: "2026-09-15",
    next_action: "Notice of Judgment Date from Court of Appeal Registry",
    retainer_agreed_ngn: 3200000,
    retainer_paid_ngn: 3200000,
    escrow_status: "Fully Paid",
    tasks: [
      { id: "t_13", text: "File Notice of Appeal and 5 Grounds of Appeal", done: true, due_date: "2026-03-02" },
      { id: "t_14", text: "Compile and transmit Record of Appeal", done: true, due_date: "2026-04-18" },
      { id: "t_15", text: "Adopt Appellant's Brief of Argument", done: true, due_date: "2026-06-30" },
      { id: "t_16", text: "Monitor daily cause list for judgment notification", done: false, due_date: "2026-09-01" }
    ],
    notes: [
      {
        id: "n_5",
        author: "Amaka Okonkwo",
        date: "2026-06-30",
        text: "Learned justices heard argument on Section 868 CAMA definition of foreign company exemptions. Reserved for judgment. Date to be communicated to counsel."
      }
    ]
  },
  {
    id: "case_005",
    lawyer_id: "lw_001",
    suit_number: "CAC/COMP/2026/894",
    title: "PayVibe Tech Ltd Share Restructuring & PSC Registry Audit",
    client_name: "PayVibe Technologies Ltd",
    client_phone: "+234 814 660 7722",
    client_email: "founders@payvibe.co",
    court: "Corporate Affairs Commission / SEC Regulatory Matter",
    presiding_judge: "Registrar-General CAC / Director Compliance",
    practice_area: "Corporate Restructuring & Compliance",
    stage: "Pleadings & Filing",
    priority: "Normal",
    filing_date: "2026-06-10",
    next_court_date: "2026-08-08",
    next_action: "Resolution of CAC Query on Foreign Shareholding Allotment Form CAC 2A",
    retainer_agreed_ngn: 750000,
    retainer_paid_ngn: 750000,
    escrow_status: "Fully Paid",
    tasks: [
      { id: "t_17", text: "Draft Board & Extraordinary General Meeting Resolutions", done: true, due_date: "2026-06-12" },
      { id: "t_18", text: "Upload Form CAC 2A and Stamp Duty certificate", done: true, due_date: "2026-06-25" },
      { id: "t_19", text: "Address Registrar query on beneficial ownership disclosure", done: false, due_date: "2026-08-08" }
    ],
    notes: [
      {
        id: "n_6",
        author: "Amaka Okonkwo",
        date: "2026-07-28",
        text: "Uploaded supplemental affidavit explaining trust ownership structure for angel investor."
      }
    ]
  }
];

export const CASE_STAGES = [
  "Intake & Consultation",
  "Pleadings & Filing",
  "Discovery & Interlocutory",
  "Trial / Cross-Examination",
  "Written Addresses",
  "Settlement Negotiation / ADR",
  "Awaiting Judgment",
  "Post-Judgment Enforcement / Closed"
];

export const NIGERIAN_COURTS = [
  "Federal High Court, Lagos Judicial Division",
  "Federal High Court, Abuja Division",
  "National Industrial Court of Nigeria (NICN)",
  "Lagos State High Court (TBS / Igbosere)",
  "Lagos State High Court (Ikeja)",
  "FCT High Court, Abuja",
  "Court of Appeal, Lagos Division",
  "Court of Appeal, Abuja Division",
  "Supreme Court of Nigeria",
  "Tax Appeal Tribunal (TAT)",
  "Investments and Securities Tribunal (IST)",
  "Corporate Affairs Commission (Administrative Proceedings)"
];
