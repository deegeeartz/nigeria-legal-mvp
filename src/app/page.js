"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  ShieldCheck,
  Scale,
  Clock,
  ChevronRight,
  FileText,
  Award,
  CheckCircle2,
  Users,
  Building2,
  Briefcase,
  Star,
  MapPin,
  Lock,
  ArrowRight,
  Check,
  ShieldAlert,
  Zap
} from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push("/search");
    }
  };

  const practiceAreas = [
    { name: "Corporate & Business", icon: Building2, area: "contracts" },
    { name: "Property & Real Estate", icon: Briefcase, area: "property" },
    { name: "Employment & Labour", icon: Users, area: "employment" },
    { name: "Family & Estate Planning", icon: Scale, area: "family" },
    { name: "Litigation & Disputes", icon: ShieldCheck, area: "litigation" }
  ];

  const featuredLawyers = [
    {
      id: "lw_001",
      name: "Amaka Okonkwo",
      title: "Senior Partner, Commercial Law",
      state: "Lagos",
      rating: 4.8,
      matters: 37,
      fee: "₦45,000",
      badges: ["NBA Verified", "Seal Valid"]
    },
    {
      id: "lw_002",
      name: "Ibrahim Yusuf SAN",
      title: "Senior Advocate of Nigeria",
      state: "Abuja (FCT)",
      rating: 4.9,
      matters: 52,
      fee: "₦60,000",
      badges: ["Senior Advocate", "Supreme Court Seal"]
    },
    {
      id: "lw_005",
      name: "Kemi Adegoke SAN",
      title: "Employment & Industrial Specialist",
      state: "Lagos",
      rating: 4.9,
      matters: 71,
      fee: "₦70,000",
      badges: ["Senior Advocate", "NBA Verified"]
    }
  ];

  return (
    <div className="flex flex-col flex-1 pb-16 md:pb-0 bg-slate-50 text-slate-900">
      {/* High-Impact Hero Section */}
      <section className="relative overflow-hidden bg-slate-950 text-white pt-12 lg:pt-16 pb-24 border-b border-slate-800">
        {/* Subtle Geometric Background Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.15),rgba(255,255,255,0))] pointer-events-none" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column: Headline, Description, Search, & CTAs */}
            <div className="lg:col-span-7">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-700/80 text-amber-400 text-xs font-bold tracking-wide mb-6 shadow-sm"
              >
                <Award size={14} className="text-amber-400 shrink-0" />
                <span>Nigeria's Verified Legal Services Portal</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1]"
              >
                Legal Counsel You Can <span className="text-emerald-400 underline decoration-emerald-500/40 decoration-wavy decoration-2">Trust</span>.
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="mt-5 text-base sm:text-lg text-slate-300 font-normal leading-relaxed max-w-xl"
              >
                Access verified Nigerian lawyers instantly. Up-front flat fees, Supreme Court enrollment check, annual Stamp & Seal compliance, and secure escrow protection on Wigally.
              </motion.p>

              {/* Search Box */}
              <motion.form
                onSubmit={handleSearchSubmit}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-8 flex flex-col sm:flex-row gap-2.5 bg-slate-900/90 p-2 rounded-2xl border border-slate-700/80 shadow-2xl backdrop-blur-md"
              >
                <div className="relative flex-1 flex items-center">
                  <Search className="absolute left-4 h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by legal specialty, state, or lawyer name..."
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-950 text-white rounded-xl placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-sm sm:text-base border border-slate-800/80"
                  />
                </div>
                <button
                  type="submit"
                  className="flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 text-white px-7 py-3.5 rounded-xl font-bold transition-all active:scale-95 text-sm sm:text-base shrink-0 shadow-lg shadow-emerald-600/30"
                >
                  Find Lawyers
                </button>
              </motion.form>

              {/* Quick Practice Area Pills */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="mt-5 flex flex-wrap gap-2 items-center"
              >
                <span className="text-xs font-semibold text-slate-400 mr-1">Popular:</span>
                {practiceAreas.map((pa) => (
                  <Link
                    key={pa.area}
                    href={`/search?area=${pa.area}`}
                    className="px-3 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-white text-xs font-medium hover:bg-slate-800 hover:border-emerald-500/50 transition-colors"
                  >
                    {pa.name}
                  </Link>
                ))}
              </motion.div>

              {/* Role Quick Links */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-8 flex flex-wrap items-center gap-4 pt-6 border-t border-slate-800/80"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-xs font-bold text-slate-300">Live Legal Portal</span>
                </div>
                <div className="h-4 w-px bg-slate-800 hidden sm:block" />
                <Link
                  href="/login"
                  className="text-xs font-bold text-emerald-400 hover:text-emerald-300 underline underline-offset-4 flex items-center gap-1"
                >
                  Sign In with Google <ArrowRight size={12} />
                </Link>
                <Link
                  href="/login/lawyer"
                  className="text-xs font-bold text-slate-300 hover:text-white underline underline-offset-4 flex items-center gap-1"
                >
                  Lawyer Portal <ArrowRight size={12} />
                </Link>
                <Link
                  href="/login/client"
                  className="text-xs font-bold text-slate-400 hover:text-slate-200 underline underline-offset-4 flex items-center gap-1"
                >
                  Client Portal <ArrowRight size={12} />
                </Link>
              </motion.div>
            </div>

            {/* Right Column: Sleek Interactive Visual Hero Graphic Card */}
            <div className="lg:col-span-5 relative">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="relative rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl overflow-hidden"
              >
                {/* Header Badge */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center justify-center font-bold">
                      <Scale size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white leading-none">Wigally Legal Guarantee</h4>
                      <p className="text-[11px] text-slate-400 mt-1">Automated Verification Engine</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Zap size={12} /> Live Audit
                  </span>
                </div>

                {/* Professional Visual Image Container */}
                <div className="relative rounded-2xl overflow-hidden border border-slate-800 mb-5 group">
                  <img
                    src="https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80"
                    alt="Wigally Legal Services"
                    className="w-full h-48 object-cover object-center group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                  
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs font-medium">
                    <span className="bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800 text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                      <ShieldCheck size={13} /> SCN Roll Verified
                    </span>
                    <span className="bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800 text-[11px] font-bold text-amber-400 flex items-center gap-1">
                      <Lock size={13} /> Escrow Protected
                    </span>
                  </div>
                </div>

                {/* Trust Metrics */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Supreme Court Check</span>
                    <span className="text-sm font-extrabold text-slate-100 flex items-center gap-1 mt-0.5">
                      <CheckCircle2 size={14} className="text-emerald-400" /> 100% Validated
                    </span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Annual Stamp & Seal</span>
                    <span className="text-sm font-extrabold text-slate-100 flex items-center gap-1 mt-0.5">
                      <CheckCircle2 size={14} className="text-amber-400" /> Rule 10 Compliant
                    </span>
                  </div>
                </div>

                {/* Direct Action Button */}
                <Link
                  href="/search"
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs sm:text-sm text-center block transition-colors shadow-md shadow-emerald-600/20"
                >
                  Browse Verified Legal Practitioners
                </Link>
              </motion.div>
            </div>

          </div>
        </div>
      </section>

      {/* High-Contrast Trust Pillars */}
      <section className="-mt-8 relative z-10 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              tag: "KYC & NBA Verified",
              icon: ShieldCheck,
              title: "100% NBA Enrollment Check",
              desc: "Every legal practitioner on Wigally undergoes strict NIN, BVN, and Supreme Court enrollment verification.",
              accent: "text-emerald-700 bg-emerald-50 border-emerald-200"
            },
            {
              tag: "Escrow Protection",
              icon: Lock,
              title: "Up-Front Transparent Fees",
              desc: "Know consultation fees in advance. Funds are held in secure escrow and released upon consultation completion.",
              accent: "text-amber-700 bg-amber-50 border-amber-200"
            },
            {
              tag: "High Legibility",
              icon: FileText,
              title: "Digital Document Hub",
              desc: "Share lease drafts, corporate contracts, and court motions with high-contrast document reading and audit logs.",
              accent: "text-slate-800 bg-slate-100 border-slate-300"
            }
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-white p-7 rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200/90 flex flex-col items-start hover:-translate-y-1 transition-all"
            >
              <div className={`p-3 rounded-xl mb-5 border ${feature.accent}`}>
                <feature.icon strokeWidth={2.5} size={24} />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">{feature.tag}</span>
              <h3 className="text-lg font-bold text-slate-900 mb-2 leading-snug">{feature.title}</h3>
              <p className="text-slate-600 font-normal text-sm leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Featured Verified Lawyers Section */}
      <section className="py-20 px-6 max-w-5xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-700">Verified Practitioners</span>
            <h2 className="text-3xl font-black text-slate-900 mt-1">Consult Top Legal Experts</h2>
            <p className="text-slate-600 text-sm mt-1">Available for immediate booking, document review, and litigation advisory.</p>
          </div>
          <Link
            href="/search"
            className="inline-flex items-center gap-1.5 text-emerald-700 hover:text-emerald-800 font-bold text-sm bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-200 self-start md:self-auto"
          >
            View All Lawyers
            <ChevronRight size={16} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featuredLawyers.map((lawyer) => (
            <div
              key={lawyer.id}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="w-12 h-12 rounded-full bg-slate-900 text-amber-400 font-black flex items-center justify-center text-lg shadow-sm border border-slate-800">
                    {lawyer.name.charAt(0)}
                  </div>
                  <div className="flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-full text-xs font-bold">
                    <Star size={12} className="fill-amber-500 text-amber-500" />
                    {lawyer.rating}
                  </div>
                </div>

                <h3 className="font-black text-slate-900 text-lg">{lawyer.name}</h3>
                <p className="text-xs font-medium text-slate-500 mt-0.5">{lawyer.title}</p>

                <div className="flex items-center gap-1 text-xs text-slate-600 mt-2 font-medium">
                  <MapPin size={14} className="text-slate-400" />
                  {lawyer.state}
                </div>

                <div className="flex flex-wrap gap-1.5 mt-4">
                  {lawyer.badges.map((b, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200"
                    >
                      <CheckCircle2 size={12} className="text-emerald-600" />
                      {b}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Consultation</span>
                  <span className="text-base font-black text-slate-900">{lawyer.fee}</span>
                </div>
                <Link
                  href={`/book/${lawyer.id}`}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm"
                >
                  Book Session
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Clear Document Readability Feature Showcase */}
      <section className="py-16 px-6 bg-slate-900 text-white border-y border-slate-800">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">Document Center</span>
            <h2 className="text-3xl font-black tracking-tight text-white mt-2 leading-tight">
              Review Legal Documents with Enhanced Readability
            </h2>
            <p className="mt-4 text-slate-300 text-sm leading-relaxed">
              Wigally provides high-contrast typography and structured formatting optimized for long-form legal agreements, court filings, and contract review.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "High-contrast text styling designed for mobile and desktop reading.",
                "Secure document uploads with full audit logging for client confidentiality.",
                "Annual Stamp & Seal verification for legal validity in Nigerian courts."
              ].map((item, idx) => (
                <li key={idx} className="flex items-start gap-3 text-xs sm:text-sm text-slate-200">
                  <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Document Preview Card */}
          <div className="bg-slate-950 p-6 sm:p-8 rounded-2xl border border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <FileText size={20} className="text-emerald-400" />
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Commercial Lease Agreement Draft</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                Seal Verified
              </span>
            </div>
            <div className="doc-text text-slate-300 text-xs sm:text-sm bg-slate-900/90 p-5 rounded-xl border border-slate-800/80 leading-relaxed font-sans space-y-3">
              <p className="font-bold text-slate-100">THIS COMMERCIAL LEASE AGREEMENT is made this 31st day of July 2026...</p>
              <p className="text-slate-300">
                1. <strong className="text-slate-100">DEMISED PREMISES:</strong> The Lessor hereby leases to the Lessee the commercial property situated in Lekki Phase 1, Lagos State.
              </p>
              <p className="text-slate-300">
                2. <strong className="text-slate-100">STAMP & SEAL COMPLIANCE:</strong> Executed under valid NBA Stamp & Seal as required under Rule 10 of the Rules of Professional Conduct 2023.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to action for lawyers */}
      <section className="py-20 px-6 max-w-5xl mx-auto w-full">
        <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 p-10 md:p-14 text-white shadow-2xl border border-slate-800 relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-amber-400">For Nigerian Practitioners</span>
              <h3 className="text-2xl sm:text-3xl font-black text-white mt-1">Are you a Legal Professional?</h3>
              <p className="text-slate-300 text-sm sm:text-base mt-2 max-w-xl">
                Expand your practice on Wigally. Manage consultations, issue digital legal advice, upload annual practice seals, and receive instant payments.
              </p>
            </div>
            <Link
              href="/signup/lawyer"
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-xl font-bold transition-all shrink-0 shadow-lg shadow-emerald-600/30 active:scale-95 text-sm sm:text-base"
            >
              Join Wigally Network
              <ChevronRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
