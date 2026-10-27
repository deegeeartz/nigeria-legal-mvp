// LinkedIn-style Legal Articles & Publishing Data for Wigally

export const INITIAL_ARTICLES = [
  {
    id: "art_001",
    slug: "navigating-cama-2020-directors-duties-startup-boards",
    title: "Navigating CAMA 2020: The Hidden Liabilities of Startup Directors and Shadow Board Members in Nigeria",
    subtitle: "Why informal advisory seats can trigger personal civil and criminal liabilities under Sections 305 and 316 of the Companies and Allied Matters Act 2020.",
    excerpt: "Many Nigerian founders treat board appointments casually, offering 'advisory equity' without formal service deeds. Here is how Nigerian corporate jurisprudence treats shadow directors and what startup legal counsel must advise before accepting board observer seats.",
    cover_image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80",
    read_time_minutes: 6,
    practice_area: "Corporate & Startups",
    published_at: "2026-08-02T10:30:00Z",
    formatted_date: "August 2, 2026",
    author: {
      id: "lw_001",
      name: "Barr. Amaka Okonkwo",
      title: "Corporate & Employment Counsel",
      firm: "Okonkwo & Associates Legal Practitioners",
      nba_branch: "Lagos Branch",
      bar_enrollment: "SCN064821",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80",
      initials: "AO",
      is_san: false,
      followers_count: 1420
    },
    metrics: {
      likes: 142,
      comments: 28,
      saves: 89,
      shares: 53
    },
    tags: ["CAMA2020", "StartupLaw", "CorporateGovernance", "NigerianStartups", "BoardDuties"],
    content: `
### The Illusion of the "Informal" Advisory Seat

In the fast-moving tech ecosystems of Yaba, Lekki, and Abuja, it has become standard practice for early-stage tech founders to invite mentors, angel investors, and experienced operators to "sit on our advisory board" in exchange for 0.5% to 1.5% equity vesting over 2 years.

Too often, these arrangements are conducted over WhatsApp messages or informal email exchanges. What many founders and professionals do not realize is that **Nigerian corporate law does not grant immunity to informal actors who direct corporate affairs**.

### Section 270 & 305: The Shadow Director Doctrine in CAMA 2020

Under **Section 270(1) of CAMA 2020**, a "director" includes any person in accordance with whose directions or instructions the directors of the company are accustomed to act. If an advisor regularly participates in strategic decisions, directs financial disbursements, or approves contracts that the nominal directors rubber-stamp, Nigerian courts will treat that advisor as a **de facto or shadow director**.

Once that status attaches, the full weight of **Section 305 fiduciary duties** applies:

1. **Duty of Utmost Good Faith**: You must act at all times in what you believe to be the best interests of the company as a whole, not merely in the interest of your personal investment vehicle.
2. **Conflict of Interest (Section 306)**: An advisor who holds interests in competing companies without full, recorded disclosure to the general meeting commits a breach of duty actionable in equity.
3. **Secret Profits & Kickbacks**: Any commission, introduction fee, or ancillary compensation not expressly disclosed and ratified must be accounted for to the company (*Regal (Hastings) Ltd v. Gulliver*).

> *"A director stands in a fiduciary relationship towards the company and shall observe the utmost good faith towards the company in any transaction with it or on its behalf."*  
> — **Section 305(1), Companies and Allied Matters Act 2020**

### The Supreme Court's Precedent: Longe v. First Bank of Nigeria Plc

In the landmark decision of *Longe v. First Bank of Nigeria Plc [2010] 6 NWLR (Pt. 1189) 1 SC*, our Supreme Court affirmed that corporate governance statutory procedures regarding directors are mandatory and cannot be waived through private agreement or corporate convenience.

When founders fall out—as frequently occurs during down-rounds or co-founder departures—informal advisors frequently discover that they are joined as co-defendants in minority oppression suits under **Section 353 of CAMA 2020**.

### 4 Mandatory Steps for Lawyers Advising Founders in 2026

1. **Formalize Advisory Agreements**: Never rely on verbal pacts. Execute a standard Advisory Board Agreement clearly specifying that the advisor exercises **no executive or managerial power** and acts purely in an advisory capacity.
2. **Observer Rights vs. Voting Powers**: If venture capital investors demand board seats, draft explicit Board Observer Letters detailing confidentiality covenants and disclaiming voting responsibilities.
3. **D&O Insurance (Directors & Officers Liability)**: Insist on D&O coverage before any senior counsel or executive accepts a formal board appointment in a venture-backed Nigerian company.
4. **Minutes & Dissents**: If you sit on a board and oppose a reckless corporate action (such as non-remittance of employee PAYE tax or pension funds), ensure your formal objection and dissent are recorded in the signed corporate minutes. Under Nigerian penal provisions, silence is construed as acquiescence.

### Conclusion

Innovation and agility should not come at the expense of sound legal compliance. Nigerian company law has matured, and the courts are increasingly intolerant of corporate governance shortcuts.
    `,
    comments: [
      {
        id: "c_1",
        author_name: "Ibrahim Yusuf SAN",
        author_role: "Senior Advocate of Nigeria",
        author_badge: "SAN • Abuja Bar",
        author_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
        created_at: "2 hours ago",
        likes: 18,
        text: "Commendable exposition, learned colleague. Counsel must particularly note Section 316 regarding reckless conduct of business. Where a company incurs debt with no reasonable expectation of repayment, the shadow director can be held personally liable without limitation."
      },
      {
        id: "c_2",
        author_name: "Adeola Balogun",
        author_role: "Managing Director, Ventures Park",
        author_badge: "Verified Client",
        author_avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
        created_at: "5 hours ago",
        likes: 12,
        text: "This is eye-opening. As an angel investor sitting on four advisory boards in Lagos, I have never requested formal Board Observer letters. Reaching out to retain counsel immediately."
      },
      {
        id: "c_3",
        author_name: "Kemi Adegoke SAN",
        author_role: "Senior Partner, Commercial Litigation",
        author_badge: "SAN • Lagos Bar",
        author_avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80",
        created_at: "1 day ago",
        likes: 9,
        text: "Well articulated, Amaka. I have seen too many young executives caught in the crossfire of shareholder disputes because they agreed to 'lend their name' to a friend's CAC registration."
      }
    ]
  },
  {
    id: "art_002",
    slug: "remote-work-national-industrial-court-jurisprudence",
    title: "The Digital Office: How the National Industrial Court is Redefining Workplace Contracts in Post-Pandemic Nigeria",
    subtitle: "Jurisprudential analysis of cross-border employment, data privacy under NDPA 2023, and constructive dismissal in remote work environments.",
    excerpt: "With thousands of Nigerian software engineers and remote professionals working for international and local firms, what laws govern when a remote contract is terminated without warning? Here is what the National Industrial Court has ruled.",
    cover_image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80",
    read_time_minutes: 8,
    practice_area: "Labour & Employment",
    published_at: "2026-07-28T14:15:00Z",
    formatted_date: "July 28, 2026",
    author: {
      id: "lw_002",
      name: "Ibrahim Yusuf SAN",
      title: "Senior Advocate of Nigeria",
      firm: "Yusuf & Partners Chambers",
      nba_branch: "Abuja Branch",
      bar_enrollment: "SCN031109",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80",
      initials: "IY",
      is_san: true,
      followers_count: 3890
    },
    metrics: {
      likes: 215,
      comments: 43,
      saves: 134,
      shares: 92
    },
    tags: ["LabourLaw", "NICN", "RemoteWork", "EmploymentContract", "NDPA2023"],
    content: `
### The New Reality of Nigerian Labour Relations

The era of clocking into a high-rise office in Marina or Central Business District Abuja is no longer the sole archetype of employment. In 2026, over 400,000 Nigerian professionals are engaged in remote or hybrid arrangements, executing contracts with employers both domestic and cross-border.

Yet, Nigeria's primary employment statute—the **Labour Act 2004**—was drafted largely for manual and clerical workers, remaining notoriously silent on digital surveillance, off-hours communication, and remote device monitoring.

### Section 254C: The Broad Jurisdiction of the National Industrial Court

Fortunately, Section 254C(1)(f) of the **1999 Constitution of the Federal Republic of Nigeria (Third Alteration Act)** empowered the National Industrial Court of Nigeria (NICN) to apply international best practices and International Labour Organization (ILO) conventions.

Under the leadership of the NICN bench, the court has consistently moved away from traditional common-law master-servant rules towards equitable protections:

1. **Digital Monitoring & NDPA 2023**: Keylogger software and invasive webcam tracking deployed on employee personal laptops without explicit, informed consent constitutes a breach of the **Nigeria Data Protection Act 2023** and fundamental privacy under Section 37 of the 1999 Constitution.
2. **Instant Slack or Email Dismissals**: Terminating an employee via a sudden revoke of workspace access without contemporaneous payment of salary in lieu of notice violates the golden principle laid down in *Chukwumah v. Shell Petroleum Development Co. (1993) 4 NWLR (Pt. 289) 512*.
3. **Constructive Dismissal in Remote Work**: Demanding an employee relocate across state lines with zero relocation allowance or slashing remote allowances unilaterally constitutes constructive dismissal.

### Guidance for In-House Counsel

Employment documentation must be overhauled to address:
- Designated remote jurisdiction and choice of law clauses
- Clear stipulations regarding remote equipment ownership and intellectual property assignment
- Enforceable restrictive covenants compliant with Nigerian anti-competition guidelines

The National Industrial Court will not allow foreign employers to exploit jurisdictional ambiguities to leave Nigerian talent unprotected.
    `,
    comments: [
      {
        id: "c_4",
        author_name: "Barr. Amaka Okonkwo",
        author_role: "NBA Human Rights Committee",
        author_badge: "Verified Counsel",
        author_avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80",
        created_at: "3 days ago",
        likes: 24,
        text: "Spot on, Learned Silk. We recently settled a matter where an international employer revoked Slack credentials without paying accrued gratuity. The threat of an NICN originating summons with damages under international best practices brought them to the table within 48 hours."
      },
      {
        id: "c_5",
        author_name: "Babajide Williams",
        author_role: "Head of People, PayRoute Africa",
        author_badge: "Verified Client",
        author_avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
        created_at: "4 days ago",
        likes: 11,
        text: "Sharing this with our human resources and legal compliance leadership across West Africa."
      }
    ]
  },
  {
    id: "art_003",
    slug: "land-use-act-governor-consent-electronic-perfection",
    title: "Governor's Consent in 2026: The Transition to Electronic C of O Perfection across Lagos and Ogun States",
    subtitle: "A comparative guide through title verification, stamp duty assessments, and navigating the Lands Bureau e-filing portal.",
    excerpt: "Purchasing real estate in Nigeria without understanding Governor's Consent under Section 22 of the Land Use Act 1978 is financial suicide. Here is how the new digital land registries are streamlining perfection.",
    cover_image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80",
    read_time_minutes: 5,
    practice_area: "Property & Real Estate",
    published_at: "2026-07-20T09:00:00Z",
    formatted_date: "July 20, 2026",
    author: {
      id: "lw_005",
      name: "Kemi Adegoke SAN",
      title: "Senior Partner, Real Estate & Dispute Resolution",
      firm: "Adegoke & Co. Legal Practitioners",
      nba_branch: "Lagos Branch",
      bar_enrollment: "SCN028912",
      avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=80",
      initials: "KA",
      is_san: true,
      followers_count: 2750
    },
    metrics: {
      likes: 184,
      comments: 31,
      saves: 112,
      shares: 76
    },
    tags: ["LandUseAct", "RealEstate", "GovernorsConsent", "LagosLandsBureau", "PropertyLaw"],
    content: `
### The Sacred Cow of Nigerian Real Estate: Section 22

Under **Section 22 of the Land Use Act 1978**, it is unlawful for the holder of a statutory right of occupancy granted by the Governor to alienate his right of occupancy or any part thereof by assignment, mortgage, transfer of possession, sublease or otherwise howsoever **without the consent of the Governor first had and obtained**.

In *Savannah Bank of Nigeria Ltd v. Ajilo [1989] 1 NWLR (Pt. 97) 305*, the Supreme Court cemented this principle: any conveyance executed without Governor's Consent is inchoate and voidable.

### The 2026 Digital Land Registry Paradigm

For decades, perfecting Governor's Consent at the Lagos State Lands Bureau in Alausa or the Ogun State Geographic Information System (OGIS) meant months of bureaucratic inertia, manual file tracking, and vulnerability to duplicate deed registrations.

The rollout of the **Electronic Title Perfection Portal (e-Title)** has transformed the process:
1. **Automated Chartered Survey Beacon Searches**: Coordinates from registered red-copy survey plans are cross-matched against excision gazettes and agricultural reserve overlays within seconds.
2. **Integrated Stamp Duty Assessment**: Direct API links with the Federal Inland Revenue Service (FIRS) and State Internal Revenue Services (LIRS) eliminate forged paper tax receipts.
3. **Digital Endorsement & QR Code Security**: Approved Deeds of Assignment now carry cryptographic NBA Seal validation and Governor's e-signature stamps, verifiable via mobile scanner.

### The Practitioner's Due Diligence Checklist
Before committing client purchase funds:
- Verify root of title at the registry (never accept uncertified photocopies).
- Check court lis pendens registers for ongoing litigation.
- Ensure the deed contains adequate vendor indemnity against competing family claims.
    `,
    comments: [
      {
        id: "c_6",
        author_name: "Sadiq Bello",
        author_role: "Property & Land Dispute Attorney",
        author_badge: "Verified Counsel",
        author_avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80",
        created_at: "1 week ago",
        likes: 14,
        text: "The e-Title portal has drastically reduced our turnaround time for searches in Alausa. Essential reading for all young real estate solicitors in Lagos."
      }
    ]
  },
  {
    id: "art_004",
    slug: "ai-and-copyright-act-2022-nigeria",
    title: "Generative AI and the Copyright Act 2022: Who Owns Works Generated by Autonomous Code in Nigeria?",
    subtitle: "Examining Section 2(1) eligibility, moral rights of human prompters, and potential infringement liabilities for Nigerian creatives and agencies.",
    excerpt: "With marketing agencies and studios adopting AI tools daily, Nigerian IP law has reached a crossroads. Can you copyright an AI-generated brand mascot or jingle under the Copyright Act 2022?",
    cover_image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80",
    read_time_minutes: 7,
    practice_area: "Tech, IP & Media",
    published_at: "2026-07-15T11:45:00Z",
    formatted_date: "July 15, 2026",
    author: {
      id: "lw_003",
      name: "Chioma Eze",
      title: "Technology & Intellectual Property Attorney",
      firm: "Eze & Partners Intellectual Property Counsel",
      nba_branch: "Lagos Branch",
      bar_enrollment: "SCN071290",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
      initials: "CE",
      is_san: false,
      followers_count: 1890
    },
    metrics: {
      likes: 98,
      comments: 19,
      saves: 64,
      shares: 41
    },
    tags: ["ArtificialIntelligence", "CopyrightAct2022", "IPLaw", "TechLaw", "NigerianCreatives"],
    content: `
### The Legislative Intent of the Copyright Act 2022

Nigeria took a monumental legislative leap forward with the enactment of the **Copyright Act 2022**, repealing the obsolete 1988 enactment and establishing digital protections, circumvention penalties, and dynamic online takedown mechanisms.

However, Section 2(1) retains the traditional foundational requirement: copyright shall be eligible only if **sufficient effort has been expended on making the work to give it an original character** and the author is an individual who is a citizen of or habitually resident in Nigeria, or a corporate entity incorporated under Nigerian law.

### The "Human Author" Dilemma

Does writing a 20-word prompt on Midjourney or Claude constitute "sufficient effort" by a human author?

1. **The Human Authorship Requirement**: Following international consensus and Nigerian jurisprudence, copyright protects original human intellectual creativity. Purely algorithmic outputs generated without meaningful human curation or transformative arrangement do not qualify for statutory copyright protection.
2. **Hybrid Works**: Where a Nigerian artist combines autonomous outputs with distinct human arrangement, digital painting, or sound mastering, copyright subsists in the human expression and assembly, not in the raw underlying AI artifacts.
3. **Training Data and Fair Dealing**: Section 20 of the Act outlines exceptions for fair dealing (criticism, review, scientific research). Nigerian courts have not yet decided whether web scraping of local artistic works for training commercial models falls within fair dealing exceptions.

### Actionable Advice for Agencies & Startups
Ensure all creative vendor contracts expressly warrant that human authorship is preserved and that generated assets do not ingest proprietary trademarks of competing commercial brands.
    `,
    comments: [
      {
        id: "c_7",
        author_name: "Chukwudi Nwosu",
        author_role: "Creative Director, Nollywood VFX",
        author_badge: "Verified Client",
        author_avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=200&q=80",
        created_at: "2 weeks ago",
        likes: 8,
        text: "We are currently drafting contracts for our latest animated series and this article answers our exact copyright questions regarding synthesized voice actors."
      }
    ]
  }
];

export const ARTICLE_TOPICS = [
  "All",
  "Corporate & Startups",
  "Labour & Employment",
  "Property & Real Estate",
  "Tech, IP & Media",
  "Banking & FinTech",
  "Litigation & Arbitration",
  "Criminal & Civil Rights"
];
