# Wigally — Nigerian Legal Marketplace & Case Platform

Wigally is a civic-driven legal technology platform designed to democratize access to justice in Nigeria. It connects citizens with verified Nigerian legal practitioners through a problem-first intake system, Rule 10-compliant escrow transactions, an active legal deliberation lounge, peer-reviewed legal articles, and a comprehensive litigation docket management system.

---

## 🚀 Key Modules & Capabilities

### 1. Problem-First Intake & Intelligent Matching (`/search`)
- Classifies citizen legal problems into specialized practice areas (CAMA 2020 Corporate, Tenancy & Property, Labour & Industrial, Civil Rights, Family).
- Weighted ranking engine incorporating NBA verification, Supreme Court Enrollment Number (SCN), practice seals, responsiveness, and price fit.
- LocalStorage offline caching for resilient client-side search even in low-bandwidth conditions.

### 2. Litigation Docket & Case Manager (`/dashboard` - Lawyer View)
- Tracks active matters across Nigerian courts (Federal High Court, National Industrial Court, Court of Appeal, etc.).
- Manages case stages (Originating Summons, Written Addresses, Cross-Examination).
- Tracks retainer financials (agreed fees vs. escrow held) and automated hearing adjournment notes.

### 3. Legal Pulse & Publishing Platform (`/articles`, `/articles/[id]`)
- LinkedIn-style thought leadership network for Nigerian legal practitioners.
- Rich legal jurisprudence content referencing CAMA 2020, Supreme Court precedents (*Longe v. First Bank of Nigeria*), Labour Act, and FIRS tax guidelines.
- Modal article writer with read-time estimation, topic tagging, and outside network sharing analytics.

### 4. Legal Lounge Community (`/community`)
- Text-based deliberation forum for public legal queries and peer exchange.
- Featured Counsel Text AMAs with active practitioners.
- Dilemma Polls with live voting distribution across community questions.
- Nigerian Legal Survival Playbooks (e.g. Police Stop Rights, Tenancy Eviction Notices).

### 5. Regulatory Compliance & Verification
- **Lawyer KYC (`/kyc`)**: SCN enrollment number submission, Call-to-Bar certificate upload, and NIMC NIN verification.
- **Annual Practice Seal & Stamp (`/lawyer/seal`)**: BPF payment verification, CPD points logging, and digital stamp record management.
- **NDPA Audit Ledger (`/admin/audit`)**: Real-time immutable event log tracking all sensitive actions, payments, and document accesses.

### 6. Escrow & Consultation Engine
- Automated escrow state machine (initialized ➔ verified ➔ released) complying with NBA Rule 10 client account regulations.
- Paystack payment initialization and verification handlers.
- Consultations feature confidential case messaging and document reviews (with video conferencing designated as on-hold).

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI & Styling**: React 19, Tailwind CSS v4, Lucide Icons, Framer Motion
- **Data Layer**: In-memory state store with `globalThis` runtime caches (`src/lib/mockDb.js`, `src/lib/caseData.js`, `src/lib/articleData.js`, `src/lib/communityData.js`)
- **PWA**: `@ducanh2912/next-pwa` with service workers and web manifest
- **Authentication**: Session provider (`src/lib/auth.js`) supporting credential login, one-click Google Sign-In, and instant role toggling

---

## 🏃 Getting Started

### Prerequisites
- Node.js 18+ (tested on Node v22)
- npm 10+

### Installation & Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:3000` to access the application.

---

## 🔑 Demo Access

See [`DEMO_CREDENTIALS.txt`](./DEMO_CREDENTIALS.txt) for ready-to-use accounts:
- **Verified Counsel**: `amaka@example.com` (Lawyer View)
- **Client User**: `client@example.com` (Client View)
- **System Admin**: `admin@example.com` (Audit & KYC Oversight)

You can also use the role toggle in the Dashboard header to switch between Lawyer and Client views instantly.
