"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useState, useEffect } from "react";
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
  Zap,
  MessageSquare,
  EyeOff,
  ThumbsUp,
  BookOpen,
  HelpCircle,
  Sparkles,
  Send,
  Radio,
  Vote,
  Bookmark
} from "lucide-react";
import { DailyQuickTake } from "@/components/community/DailyQuickTake";
import { CommunityPoll } from "@/components/community/CommunityPoll";
import { AmaBanner } from "@/components/community/AmaBanner";
import { PlaybookLibrary } from "@/components/community/PlaybookLibrary";

export default function LandingPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [heroTab, setHeroTab] = useState("ask"); // "ask" | "search"
  const [quickQuestion, setQuickQuestion] = useState("");
  const [quickCategory, setQuickCategory] = useState("Tenancy & Property");
  const [quickAnonymous, setQuickAnonymous] = useState(true);
  const [communityData, setCommunityData] = useState({
    questions: [],
    polls: [],
    amas: [],
    quickTakes: [],
    playbooks: [],
    onlineLawyersCount: 19
  });

  useEffect(() => {
    async function loadCommunity() {
      try {
        const res = await fetch("/api/community");
        if (res.ok) {
          const data = await res.json();
          setCommunityData(data);
        }
      } catch (err) {
        console.error("Failed to load community feed:", err);
      }
    }
    loadCommunity();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push("/search");
    }
  };

  const handleQuickAskSubmit = (e) => {
    e.preventDefault();
    if (quickQuestion.trim()) {
      router.push(
        `/community?ask=${encodeURIComponent(quickQuestion.trim())}&cat=${encodeURIComponent(quickCategory)}&anon=${quickAnonymous}`
      );
    } else {
      router.push("/community");
    }
  };

  const practiceAreas = [
    { name: "Tenancy & Property", icon: Briefcase, area: "property" },
    { name: "Startups & CAC", icon: Building2, area: "contracts" },
    { name: "Employment & Labour", icon: Users, area: "employment" },
    { name: "Civil & Privacy Rights", icon: Scale, area: "litigation" },
    { name: "Family & Estate", icon: ShieldCheck, area: "family" }
  ];

  const featuredLawyers = [
    {
      id: "lw_001",
      name: "Amaka Okonkwo",
      title: "Senior Partner • Commercial & Property Law",
      state: "Lagos State",
      rating: 4.8,
      matters: 37,
      badges: ["NBA Verified", "Seal Valid"],
      status: "Available for Consultation"
    },
    {
      id: "lw_002",
      name: "Ibrahim Yusuf SAN",
      title: "Senior Advocate of Nigeria",
      state: "Abuja (FCT)",
      rating: 4.9,
      matters: 52,
      badges: ["Senior Silk", "Supreme Court Bar"],
      status: "Available for High Court Retainers"
    },
    {
      id: "lw_005",
      name: "Kemi Adegoke SAN",
      title: "Senior Advocate & Employment Law Specialist",
      state: "Lagos State",
      rating: 4.9,
      matters: 64,
      badges: ["Senior Silk", "Industrial Court Arbitrator"],
      status: "Active in Community Lounge"
    }
  ];

  return (
    <div className="min-h-screen warm-parchment-pattern flex flex-col justify-between">
      {/* Live Community Ticker */}
      <div className="bg-stone-900 text-stone-300 py-2.5 px-4 text-xs border-b border-stone-800">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-white">Live Legal Lounge:</span>
            <span>{communityData.onlineLawyersCount || 19} Verified Nigerian Lawyers Active Now</span>
          </div>
          <Link
            href="/community"
            className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300 font-semibold transition-colors"
          >
            <span>Join Text Discussions & Q&A</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      <main className="space-y-16 pb-20">
        {/* Warm Editorial Hero Section */}
        <section className="relative overflow-hidden pt-12 pb-16 px-4 sm:px-6 lg:px-8 border-b border-stone-200 bg-gradient-to-b from-stone-100/60 to-transparent">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Hero Column */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100/70 border border-amber-300/60 text-amber-900 text-xs font-semibold">
                <Sparkles size={14} className="text-amber-700" />
                <span>Nigeria’s Interactive Legal Community & Directory</span>
              </div>

              <h1 className="font-editorial text-4xl sm:text-5xl lg:text-6xl font-black text-stone-900 tracking-tight leading-[1.08]">
                Real legal guidance. <br />
                <span className="text-amber-800 italic font-serif">Verified lawyers</span>, zero barriers.
              </h1>

              <p className="text-stone-600 text-base sm:text-lg max-w-xl leading-relaxed">
                Ask questions anonymously in our community lounge, test your rights with weekly dilemma polls, and consult NBA-verified advocates without intimidating upfront barriers.
              </p>

              {/* Interactive Hero Box with Ask / Search Switcher */}
              <div className="editorial-card rounded-2xl p-6 bg-white border border-stone-300 shadow-md">
                <div className="flex items-center gap-3 pb-3 border-b border-stone-200">
                  <button
                    onClick={() => setHeroTab("ask")}
                    className={`flex items-center gap-2 pb-2 text-xs sm:text-sm font-bold border-b-2 transition-all ${
                      heroTab === "ask"
                        ? "border-amber-800 text-amber-900"
                        : "border-transparent text-stone-500 hover:text-stone-800"
                    }`}
                  >
                    <MessageSquare size={16} />
                    <span>Ask Community Lounge</span>
                  </button>

                  <button
                    onClick={() => setHeroTab("search")}
                    className={`flex items-center gap-2 pb-2 text-xs sm:text-sm font-bold border-b-2 transition-all ${
                      heroTab === "search"
                        ? "border-amber-800 text-amber-900"
                        : "border-transparent text-stone-500 hover:text-stone-800"
                    }`}
                  >
                    <Search size={16} />
                    <span>Find Verified Lawyer</span>
                  </button>
                </div>

                {heroTab === "ask" ? (
                  <form onSubmit={handleQuickAskSubmit} className="mt-4 space-y-3">
                    <div className="flex items-center justify-between text-xs text-stone-600">
                      <span className="font-semibold text-stone-800">
                        Ask any legal dilemma:
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuickAnonymous(!quickAnonymous)}
                        className="flex items-center gap-1.5 text-stone-500 hover:text-stone-900 font-mono text-[11px]"
                      >
                        <EyeOff size={13} className={quickAnonymous ? "text-amber-800" : ""} />
                        <span>{quickAnonymous ? "Posting Anonymously" : "Public Mode"}</span>
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={quickQuestion}
                        onChange={(e) => setQuickQuestion(e.target.value)}
                        placeholder="e.g. Can my landlord increase rent without a 6-month notice?"
                        className="flex-1 px-4 py-3 rounded-xl bg-stone-50 border border-stone-300 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-500"
                      />
                      <button
                        type="submit"
                        className="px-5 py-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 shrink-0 shadow-sm"
                      >
                        <span>Ask Lounge</span>
                        <Send size={14} />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-stone-500 font-mono">
                      <span>Popular topics:</span>
                      <button
                        type="button"
                        onClick={() => setQuickQuestion("Can police search my phone at a checkpoint?")}
                        className="hover:underline text-stone-700"
                      >
                        #PoliceCheckpoints
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => setQuickQuestion("Co-founder quit after 3 months, can they keep equity?")}
                        className="hover:underline text-stone-700"
                      >
                        #FounderEquity
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleSearchSubmit} className="mt-4 space-y-3">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search size={16} className="absolute left-3.5 top-3.5 text-stone-400" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search by legal issue, specialty or state (e.g. Lagos, Tech Contracts)..."
                          className="w-full pl-10 pr-4 py-3 rounded-xl bg-stone-50 border border-stone-300 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-500"
                        />
                      </div>
                      <button
                        type="submit"
                        className="px-5 py-3 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 shrink-0 shadow-sm"
                      >
                        <span>Find Counsel</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* Right Hero Column: Daily Quick Take Card */}
            <div className="lg:col-span-5 space-y-4">
              <DailyQuickTake quickTakes={communityData.quickTakes} />
            </div>
          </div>
        </section>

        {/* Live Audio AMAs Section */}
        {communityData.amas && communityData.amas.length > 0 && (
          <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <AmaBanner amas={communityData.amas} />
          </section>
        )}

        {/* Community Dilemma Poll & Trending Deliberation Bento */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-900">
                Interactive Community
              </span>
              <h2 className="font-editorial text-2xl sm:text-3xl font-bold text-stone-900 mt-1">
                This Week in the Legal Lounge
              </h2>
            </div>
            <Link
              href="/community"
              className="text-xs sm:text-sm font-semibold text-stone-800 hover:text-amber-800 flex items-center gap-1.5"
            >
              <span>Explore All Community Discussions</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Poll column */}
            <div className="lg:col-span-5">
              {communityData.polls?.[0] && (
                <CommunityPoll
                  initialPoll={communityData.polls[0]}
                  onVoteSuccess={(updated) => {
                    setCommunityData((prev) => ({
                      ...prev,
                      polls: prev.polls.map((p) => (p.id === updated.id ? updated : p))
                    }));
                  }}
                />
              )}
            </div>

            {/* Deliberation spotlight column */}
            <div className="lg:col-span-7">
              {communityData.questions?.[0] && (
                <div className="editorial-card rounded-2xl p-6 bg-white border border-stone-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-stone-600 bg-stone-100 px-2 py-0.5 rounded">
                      Trending Deliberation
                    </span>
                    <span className="text-xs text-stone-400 font-mono">
                      {communityData.questions[0].created_at}
                    </span>
                  </div>

                  <h3 className="font-editorial text-xl font-bold text-stone-900 leading-snug">
                    {communityData.questions[0].title}
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-600 leading-relaxed font-sans line-clamp-3">
                    {communityData.questions[0].body}
                  </p>

                  {/* Top Lawyer opinion preview */}
                  {communityData.questions[0].answers?.[0] && (
                    <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/60 text-xs text-stone-700 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-stone-900">
                          {communityData.questions[0].answers[0].lawyer_name}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold uppercase">
                          NBA Verified
                        </span>
                      </div>
                      <p className="line-clamp-2 italic">
                        "{communityData.questions[0].answers[0].body}"
                      </p>
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-between border-t border-stone-100">
                    <div className="text-xs text-stone-500 font-mono">
                      {communityData.questions[0].answers?.length || 0} Verified Counsel Deliberating
                    </div>
                    <Link
                      href="/community"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-900 hover:text-amber-800"
                    >
                      <span>Read Full Legal Debate</span>
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Legal Survival Playbooks Preview */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <PlaybookLibrary playbooks={communityData.playbooks} />
        </section>

        {/* LinkedIn-Style Legal Publications Showcase */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-800">
                  Wigally Legal Pulse
                </span>
                <h2 className="font-editorial text-2xl sm:text-3xl font-black text-stone-900 mt-1">
                  Peer-Reviewed Legal Publications & Thought Leadership
                </h2>
                <p className="text-xs sm:text-sm text-stone-500 mt-1 font-medium">
                  Verified Nigerian lawyers publish in-depth statutory breakdowns that colleagues and clients can deliberate, applaud, bookmark, and share outside the network to LinkedIn and WhatsApp.
                </p>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <Link
                  href="/articles"
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black uppercase tracking-wider transition-all shadow-xs"
                >
                  Browse All Articles →
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="border border-stone-200 rounded-2xl p-5 hover:border-amber-400 transition-all flex flex-col justify-between bg-stone-50/50">
                <div className="space-y-2.5">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900">
                    Corporate & Startups
                  </span>
                  <Link href="/articles/navigating-cama-2020-directors-duties-startup-boards">
                    <h3 className="font-black text-stone-900 text-sm font-serif hover:text-amber-900 transition-colors line-clamp-2">
                      Navigating CAMA 2020: The Hidden Liabilities of Startup Directors in Nigeria
                    </h3>
                  </Link>
                  <p className="text-xs text-stone-500 line-clamp-2 font-medium">
                    Why informal advisory seats trigger personal civil and criminal liabilities under Sections 305 and 316.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-stone-200 flex items-center justify-between text-xs text-stone-500">
                  <span className="font-bold text-stone-700">Barr. Amaka Okonkwo</span>
                  <span>142 applauds • 6 min</span>
                </div>
              </div>

              <div className="border border-stone-200 rounded-2xl p-5 hover:border-amber-400 transition-all flex flex-col justify-between bg-stone-50/50">
                <div className="space-y-2.5">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-900">
                    Labour & Employment
                  </span>
                  <Link href="/articles/remote-work-national-industrial-court-jurisprudence">
                    <h3 className="font-black text-stone-900 text-sm font-serif hover:text-amber-900 transition-colors line-clamp-2">
                      The Digital Office: National Industrial Court Jurisprudence on Remote Work
                    </h3>
                  </Link>
                  <p className="text-xs text-stone-500 line-clamp-2 font-medium">
                    Analysis of cross-border employment, device privacy under NDPA 2023, and constructive dismissal.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-stone-200 flex items-center justify-between text-xs text-stone-500">
                  <span className="font-bold text-stone-700">Ibrahim Yusuf SAN</span>
                  <span>215 applauds • 8 min</span>
                </div>
              </div>

              <div className="border border-stone-200 rounded-2xl p-5 hover:border-amber-400 transition-all flex flex-col justify-between bg-stone-50/50">
                <div className="space-y-2.5">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900">
                    Property & Real Estate
                  </span>
                  <Link href="/articles/land-use-act-governor-consent-electronic-perfection">
                    <h3 className="font-black text-stone-900 text-sm font-serif hover:text-amber-900 transition-colors line-clamp-2">
                      Governor's Consent in 2026: Electronic Title Perfection across Lagos & Ogun
                    </h3>
                  </Link>
                  <p className="text-xs text-stone-500 line-clamp-2 font-medium">
                    Automated chartered survey beacon searches, stamp duty assessments, and navigating e-Title registries.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-stone-200 flex items-center justify-between text-xs text-stone-500">
                  <span className="font-bold text-stone-700">Kemi Adegoke SAN</span>
                  <span>184 applauds • 5 min</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Verified Counsel Directory Spotlight (No Upfront Price Ads) */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-900">
                Verified Legal Directory
              </span>
              <h2 className="font-editorial text-2xl sm:text-3xl font-bold text-stone-900 mt-1">
                Connect with Verified Counsel
              </h2>
              <p className="text-xs sm:text-sm text-stone-500 mt-1">
                Every lawyer is independently audited against NBA Roll of Legal Practitioners, NIN, and Supreme Court records.
              </p>
            </div>
            <Link
              href="/search"
              className="px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 transition-colors"
            >
              Browse Complete Directory
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredLawyers.map((lawyer) => (
              <div
                key={lawyer.id}
                className="editorial-card rounded-2xl p-6 bg-white border border-stone-200 flex flex-col justify-between shadow-sm hover:border-stone-300 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-stone-100 border border-stone-200 text-stone-800 font-bold flex items-center justify-center text-sm">
                      {lawyer.name.charAt(0)}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-amber-700 font-semibold font-mono">
                      <Star size={13} fill="currentColor" />
                      <span>{lawyer.rating}</span>
                    </div>
                  </div>

                  <h3 className="font-bold text-base text-stone-900">{lawyer.name}</h3>
                  <p className="text-xs text-stone-500 mt-1 leading-snug">{lawyer.title}</p>
                  <p className="text-xs text-stone-400 mt-1 flex items-center gap-1">
                    <MapPin size={12} /> {lawyer.state}
                  </p>

                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {lawyer.badges.map((b) => (
                      <span
                        key={b}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 font-semibold border border-stone-200"
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-emerald-800 font-semibold">
                    {lawyer.status}
                  </span>
                  <Link
                    href={`/search?q=${encodeURIComponent(lawyer.name)}`}
                    className="text-xs font-bold text-stone-900 hover:text-amber-800 flex items-center gap-1"
                  >
                    <span>Profile</span>
                    <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Editorial Footer */}
      <footer className="bg-stone-900 text-stone-400 py-12 px-4 sm:px-6 lg:px-8 border-t border-stone-800 text-xs">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-stone-800 flex items-center justify-center text-amber-400 font-bold">
              <Scale size={18} />
            </div>
            <div>
              <span className="font-bold text-white text-sm">Wigally</span>
              <p className="text-[11px] text-stone-500">
                Verified Legal Services & Community Lounge in Nigeria
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-6 text-stone-300">
            <Link href="/community" className="hover:text-white transition-colors">
              Community Lounge
            </Link>
            <Link href="/search" className="hover:text-white transition-colors">
              Find Verified Lawyers
            </Link>
            <Link href="/login" className="hover:text-white transition-colors">
              Sign In
            </Link>
            <Link href="/signup" className="hover:text-white transition-colors">
              Join as Lawyer or Client
            </Link>
          </div>

          <p className="text-[11px] text-stone-500">
            © {new Date().getFullYear()} Wigally. Designed for legal clarity & community deliberation.
          </p>
        </div>
      </footer>
    </div>
  );
}
