"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { GoogleIcon } from "@/components/GoogleAuthButton";
import { LawyerCaseManager } from "@/components/dashboard/LawyerCaseManager";
import { ArticleEditorModal } from "@/components/articles/ArticleEditorModal";
import {
  Scale,
  ShieldCheck,
  Briefcase,
  Users,
  Calendar,
  MessageSquare,
  Stamp,
  ArrowUpRight,
  Clock,
  FileText,
  CreditCard,
  LogOut,
  Sparkles,
  ChevronRight,
  AlertCircle,
  PenTool,
  BookOpen,
  Share2,
  Heart,
  Bookmark
} from "lucide-react";

export default function DashboardPage() {
  const { user, logout, loading, setUser } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("cases"); // "cases", "consultations", "publications"
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [lawyerArticles, setLawyerArticles] = useState([]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.role === "lawyer") {
      fetch(`/api/articles?author_id=${user.lawyer_id || "lw_001"}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.status === "success") {
            setLawyerArticles(data.articles || []);
          }
        })
        .catch((err) => console.error(err));
    }
  }, [user]);

  const handleRoleToggle = () => {
    if (!user) return;
    const newRole = user.role === "lawyer" ? "client" : "lawyer";
    const updated = {
      ...user,
      role: newRole,
      lawyer_id: newRole === "lawyer" ? (user.lawyer_id || "lw_001") : null,
    };
    setUser(updated);
  };

  const handleArticlePublished = (newArticle) => {
    setLawyerArticles((prev) => [newArticle, ...prev]);
  };

  if (loading || !user) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-stone-500">Loading your Wigally portal...</p>
        </div>
      </div>
    );
  }

  const isLawyer = user.role === "lawyer";

  return (
    <div className="flex-1 bg-stone-100/70 pb-20 md:pb-12">
      {/* Top Banner / Welcome Header */}
      <div className="bg-stone-900 text-stone-100 pt-8 pb-16 px-4 md:px-8 border-b border-stone-800">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span
                className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider ${
                  isLawyer
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                }`}
              >
                {isLawyer ? "Legal Practitioner Portal" : "Client Legal Portal"}
              </span>

              {user.auth_provider === "google" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-stone-200 border border-white/20">
                  <GoogleIcon className="w-3.5 h-3.5" />
                  Google Verified
                </span>
              )}

              {isLawyer && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck size={13} />
                  NBA Lagos SCN064821
                </span>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-black font-serif tracking-tight">
              Welcome back, {user.full_name}
            </h1>
            <p className="text-stone-400 text-sm max-w-xl font-medium">
              {isLawyer
                ? "Manage your active Nigerian court dockets, client retainers, and publish peer-reviewed legal articles."
                : "Manage your legal requests, upcoming lawyer consultations, and case documents in one secure workspace."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isLawyer && (
              <button
                onClick={() => setIsEditorOpen(true)}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black rounded-xl shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
              >
                <PenTool size={14} /> Write Article
              </button>
            )}
            <button
              onClick={handleRoleToggle}
              className="px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold rounded-xl border border-stone-700 transition-colors"
            >
              Switch to {isLawyer ? "Client View" : "Lawyer View"}
            </button>
            <button
              onClick={logout}
              className="px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-bold rounded-xl border border-rose-500/30 transition-colors flex items-center gap-1.5"
            >
              <LogOut size={14} /> Log Out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 -mt-8 space-y-8">
        {/* Lawyer View Tab Bar */}
        {isLawyer ? (
          <div className="bg-white rounded-2xl p-1.5 border border-stone-200 shadow-sm flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab("cases")}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === "cases"
                  ? "bg-stone-900 text-white shadow-xs"
                  : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
              }`}
            >
              <Briefcase size={15} />
              <span>Case Management & Dockets</span>
            </button>

            <button
              onClick={() => setActiveTab("consultations")}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === "consultations"
                  ? "bg-stone-900 text-white shadow-xs"
                  : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
              }`}
            >
              <Calendar size={15} />
              <span>Consultations & Sessions (3)</span>
            </button>

            <button
              onClick={() => setActiveTab("publications")}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === "publications"
                  ? "bg-stone-900 text-white shadow-xs"
                  : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
              }`}
            >
              <BookOpen size={15} />
              <span>My Published Articles ({lawyerArticles.length})</span>
            </button>
          </div>
        ) : null}

        {/* Content based on Role and Active Tab */}
        {isLawyer && activeTab === "cases" ? (
          <LawyerCaseManager
            lawyerId={user.lawyer_id || "lw_001"}
            lawyerName={user.full_name || "Barr. Amaka Okonkwo"}
          />
        ) : isLawyer && activeTab === "publications" ? (
          /* Lawyer's Articles and Publishing Workspace */
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-100 text-amber-900">
                    LinkedIn-Style Publishing
                  </span>
                  <span className="text-xs text-stone-400">• Thought Leadership</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-stone-900 font-serif">
                  My Published Legal Insights
                </h2>
                <p className="text-xs text-stone-500 font-medium">
                  Articles authored by you on Nigerian legal developments, CAMA 2020, labour law, and real estate.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href="/articles"
                  className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-colors"
                >
                  View Public Feed →
                </Link>
                <button
                  onClick={() => setIsEditorOpen(true)}
                  className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
                >
                  <PenTool size={14} /> Write New Article
                </button>
              </div>
            </div>

            {/* Articles List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {lawyerArticles.map((art) => (
                <div
                  key={art.id}
                  className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs flex flex-col justify-between space-y-4 hover:border-stone-300 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-stone-400">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900">
                        {art.practice_area}
                      </span>
                      <span>{art.read_time_minutes} min read</span>
                    </div>

                    <Link href={`/articles/${art.slug || art.id}`} className="block group">
                      <h3 className="text-base font-black text-stone-900 font-serif leading-snug group-hover:text-amber-900 transition-colors">
                        {art.title}
                      </h3>
                    </Link>

                    <p className="text-xs text-stone-600 line-clamp-2 font-medium">
                      {art.subtitle || art.excerpt}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 font-bold text-stone-700">
                        <Heart size={13} className="text-rose-500" /> {art.metrics?.likes || 0}
                      </span>
                      <span className="flex items-center gap-1 font-bold text-stone-700">
                        <MessageSquare size={13} className="text-stone-500" /> {art.metrics?.comments || 0}
                      </span>
                      <span className="flex items-center gap-1 font-bold text-stone-700">
                        <Share2 size={13} className="text-stone-500" /> {art.metrics?.shares || 0}
                      </span>
                    </div>

                    <Link
                      href={`/articles/${art.slug || art.id}`}
                      className="text-xs font-bold text-amber-900 hover:underline flex items-center gap-1"
                    >
                      Read full article →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Consultations & Standard Portal View (or Client View) */
          <div className="space-y-8">
            {/* Metric Cards Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {isLawyer ? (
                <>
                  <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
                    <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Active Matters</span>
                    <p className="text-2xl font-black text-stone-900 mt-2 font-serif">12</p>
                    <span className="text-[11px] font-semibold text-emerald-700 mt-1 inline-block">↑ 2 new this week</span>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
                    <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Scheduled Sessions</span>
                    <p className="text-2xl font-black text-stone-900 mt-2 font-serif">3</p>
                    <span className="text-[11px] font-semibold text-stone-500 mt-1 inline-block">Next today at 2:00 PM</span>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
                    <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Escrow Revenue</span>
                    <p className="text-2xl font-black text-stone-900 mt-2 font-serif">₦585,000</p>
                    <span className="text-[11px] font-semibold text-emerald-700 mt-1 inline-block">Paystack Protected</span>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
                    <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Client Rating</span>
                    <p className="text-2xl font-black text-stone-900 mt-2 font-serif">4.9 ★</p>
                    <span className="text-[11px] font-semibold text-emerald-700 mt-1 inline-block">Top 5% in Lagos Bar</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
                    <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">My Consultations</span>
                    <p className="text-2xl font-black text-stone-900 mt-2 font-serif">2</p>
                    <span className="text-[11px] font-semibold text-indigo-700 mt-1 inline-block">1 upcoming session</span>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
                    <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Assigned Lawyers</span>
                    <p className="text-2xl font-black text-stone-900 mt-2 font-serif">1</p>
                    <span className="text-[11px] font-semibold text-stone-500 mt-1 inline-block">Amaka Okonkwo (SAN)</span>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
                    <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Escrow Deposited</span>
                    <p className="text-2xl font-black text-stone-900 mt-2 font-serif">₦45,000</p>
                    <span className="text-[11px] font-semibold text-emerald-700 mt-1 inline-block">Safe in Escrow</span>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
                    <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Shared Documents</span>
                    <p className="text-2xl font-black text-stone-900 mt-2 font-serif">3</p>
                    <span className="text-[11px] font-semibold text-stone-500 mt-1 inline-block">NDPA Encrypted</span>
                  </div>
                </>
              )}
            </div>

            {/* Lawyer Verification Bar */}
            {isLawyer && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-md">
                    <ShieldCheck size={26} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-emerald-950 font-serif">Nigerian Bar Association (NBA) Verified Status</h3>
                    <p className="text-xs text-emerald-800 font-medium mt-0.5">
                      Supreme Court Enrollment SCN064821 • Lagos Branch • Eligible for Digital Seal issuance
                    </p>
                  </div>
                </div>
                <Link
                  href="/search"
                  className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all whitespace-nowrap"
                >
                  View Public Directory Listing →
                </Link>
              </div>
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column (2 Cols): Consultations */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-black text-stone-900 font-serif flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-amber-600" />
                      Upcoming Consultations
                    </h3>
                    <Link href="/search" className="text-xs font-bold text-amber-900 hover:underline flex items-center gap-1">
                      Find more lawyers <ChevronRight size={14} />
                    </Link>
                  </div>

                  {/* Consultation Card */}
                  <div className="border border-stone-200 rounded-2xl p-5 hover:border-stone-300 transition-all bg-stone-50/50">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-200">
                      <div>
                        <span className="text-[10px] font-mono font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-900">
                          Confirmed • Aug 5, 2026
                        </span>
                        <h4 className="text-sm font-black text-stone-900 font-serif mt-1.5">
                          Review commercial property lease agreement in Lekki Phase 1
                        </h4>
                        <p className="text-xs text-stone-500 font-medium">
                          {isLawyer ? "Client: Tunde Bakare" : "Counsel: Barrister Amaka Okonkwo (NBA Verified)"}
                        </p>
                      </div>
                      <div className="text-right sm:text-right">
                        <span className="text-base font-black text-stone-900 font-serif">₦45,000</span>
                        <span className="block text-[10px] text-stone-400 font-mono font-bold uppercase">Escrow Held</span>
                      </div>
                    </div>

                    <div className="pt-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs font-semibold text-stone-600">
                        <Clock size={15} className="text-stone-400" />
                        10:00 AM - 11:00 AM (WAT)
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-[11px] font-bold flex items-center gap-1">
                          <Clock size={12} />
                          Video Room: On Hold
                        </span>
                        <button
                          onClick={() => alert("Secure case messaging thread is open. You can exchange matter notes and confidential review documents with counsel.")}
                          className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-2xs transition-all"
                        >
                          <MessageSquare size={14} /> Case Chat & Docs
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 p-2.5 rounded-xl bg-stone-100 border border-stone-200 text-[11px] text-stone-600 flex items-center gap-2">
                      <AlertCircle size={14} className="text-amber-600 shrink-0" />
                      <span>In-app video conferencing is currently on hold. Consultations proceed via confidential case chat, document reviews, and verified intake.</span>
                    </div>
                  </div>
                </div>

                {/* Quick Navigation Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Link
                    href="/articles"
                    className="bg-white p-5 rounded-2xl border border-stone-200 hover:border-amber-500 hover:shadow-xs transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                      <BookOpen size={20} />
                    </div>
                    <h4 className="text-sm font-black text-stone-900 group-hover:text-amber-900 transition-colors font-serif">
                      Legal Pulse & Articles
                    </h4>
                    <p className="text-xs text-stone-500 font-medium mt-1">
                      Read, deliberate, applaud, and share peer-reviewed Nigerian legal analysis.
                    </p>
                  </Link>

                  <Link
                    href="/community"
                    className="bg-white p-5 rounded-2xl border border-stone-200 hover:border-stone-400 hover:shadow-xs transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-800 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                      <MessageSquare size={20} />
                    </div>
                    <h4 className="text-sm font-black text-stone-900 font-serif">
                      Legal Lounge Q&A Forum
                    </h4>
                    <p className="text-xs text-stone-500 font-medium mt-1">
                      Ask questions anonymously or participate in legal deliberations with colleagues.
                    </p>
                  </Link>
                </div>
              </div>

              {/* Right Column (1 Col): Account & Identity */}
              <div className="space-y-6">
                <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs">
                  <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-4">
                    Verified Account Details
                  </h3>
                  <div className="flex items-center gap-3.5 pb-4 border-b border-stone-100">
                    <div className="w-12 h-12 rounded-full bg-stone-900 text-amber-400 font-bold text-lg flex items-center justify-center shrink-0">
                      {user.full_name?.charAt(0) || "U"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-stone-900 truncate font-serif">{user.full_name}</p>
                      <p className="text-xs text-stone-500 truncate">{user.email}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-mono font-extrabold uppercase bg-stone-100 text-stone-700">
                        Role: {user.role}
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-stone-500 font-medium">Auth Provider</span>
                      <span className="font-bold text-stone-800 flex items-center gap-1 capitalize">
                        {user.auth_provider === "google" && <GoogleIcon className="w-3.5 h-3.5" />}
                        {user.auth_provider || "Email/Password"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-stone-500 font-medium">Jurisdiction</span>
                      <span className="font-bold text-stone-800">Federal Republic of Nigeria</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-stone-500 font-medium">NDPA Status</span>
                      <span className="font-bold text-emerald-700">Consent Recorded</span>
                    </div>
                  </div>
                </div>

                {/* Platform Guarantee Card */}
                <div className="bg-stone-900 text-stone-200 p-6 rounded-3xl shadow-sm space-y-3 border border-stone-800">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wide">
                    <Sparkles size={16} /> Wigally Escrow Guarantee
                  </div>
                  <h4 className="text-sm font-black text-white font-serif leading-snug">
                    100% Retainer Protection
                  </h4>
                  <p className="text-xs text-stone-300 leading-relaxed font-medium">
                    Funds remain in Nigerian banking escrow compliant with Rule 10 until milestones or consultation sessions conclude.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Write Article Modal */}
      <ArticleEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onPublished={handleArticlePublished}
        currentLawyer={{
          lawyer_id: user.lawyer_id || "lw_001",
          full_name: user.full_name || "Barr. Amaka Okonkwo",
          title: "Corporate & Employment Counsel",
          firm: "Okonkwo & Associates",
          is_san: false
        }}
      />
    </div>
  );
}
