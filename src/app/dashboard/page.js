"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { GoogleIcon } from "@/components/GoogleAuthButton";
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
  Video,
  FileText,
  CreditCard,
  LogOut,
  Sparkles,
  ChevronRight,
  AlertCircle
} from "lucide-react";

export default function DashboardPage() {
  const { user, logout, loading, setUser } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

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

  if (loading || !user) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-slate-500">Loading your Wigally portal...</p>
        </div>
      </div>
    );
  }

  const isLawyer = user.role === "lawyer";

  return (
    <div className="flex-1 bg-slate-50 pb-20 md:pb-12">
      {/* Top Banner / Welcome Header */}
      <div className="bg-slate-900 text-white pt-8 pb-16 px-4 md:px-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  isLawyer ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                }`}
              >
                {isLawyer ? "Legal Practitioner Portal" : "Client Legal Portal"}
              </span>

              {user.auth_provider === "google" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-slate-200 border border-white/20">
                  <GoogleIcon className="w-3.5 h-3.5" />
                  Google Verified
                </span>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              Welcome back, {user.full_name}
            </h1>
            <p className="text-slate-400 text-sm max-w-xl">
              {isLawyer
                ? "Manage your active legal matters, verified consultations, and digital NBA practice seals across Nigeria."
                : "Manage your legal requests, upcoming lawyer consultations, and case documents in one secure workspace."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleRoleToggle}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors"
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
        {/* Metric Cards Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {isLawyer ? (
            <>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Matters</span>
                <p className="text-2xl font-black text-slate-900 mt-2">12</p>
                <span className="text-[11px] font-semibold text-emerald-600 mt-1 inline-block">↑ 2 new this week</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Scheduled Sessions</span>
                <p className="text-2xl font-black text-slate-900 mt-2">3</p>
                <span className="text-[11px] font-semibold text-slate-500 mt-1 inline-block">Next today at 2:00 PM</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Escrow Revenue</span>
                <p className="text-2xl font-black text-slate-900 mt-2">₦585,000</p>
                <span className="text-[11px] font-semibold text-emerald-600 mt-1 inline-block">Paystack Protected</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Client Rating</span>
                <p className="text-2xl font-black text-slate-900 mt-2">4.9 ★</p>
                <span className="text-[11px] font-semibold text-emerald-600 mt-1 inline-block">Top 5% in Lagos Bar</span>
              </div>
            </>
          ) : (
            <>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">My Consultations</span>
                <p className="text-2xl font-black text-slate-900 mt-2">2</p>
                <span className="text-[11px] font-semibold text-indigo-600 mt-1 inline-block">1 upcoming session</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Assigned Lawyers</span>
                <p className="text-2xl font-black text-slate-900 mt-2">1</p>
                <span className="text-[11px] font-semibold text-slate-500 mt-1 inline-block">Amaka Okonkwo SAN</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Escrow Deposited</span>
                <p className="text-2xl font-black text-slate-900 mt-2">₦45,000</p>
                <span className="text-[11px] font-semibold text-emerald-600 mt-1 inline-block">Safe in Escrow</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Shared Documents</span>
                <p className="text-2xl font-black text-slate-900 mt-2">3</p>
                <span className="text-[11px] font-semibold text-slate-500 mt-1 inline-block">NDPA Encrypted</span>
              </div>
            </>
          )}
        </div>

        {/* Lawyer Verification Bar */}
        {isLawyer && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20">
                <ShieldCheck size={26} />
              </div>
              <div>
                <h3 className="text-base font-black text-emerald-950">Nigerian Bar Association (NBA) Verified Status</h3>
                <p className="text-xs text-emerald-800 font-medium mt-0.5">
                  Supreme Court Enrollment SCN064821 • Lagos Branch • Eligible for Digital Seal issuance
                </p>
              </div>
            </div>
            <Link
              href="/search"
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all whitespace-nowrap"
            >
              View Public Directory Listing →
            </Link>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column (2 Cols): Consultations & Cases */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-600" />
                  Upcoming Consultations
                </h3>
                <Link href="/search" className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                  Find more lawyers <ChevronRight size={14} />
                </Link>
              </div>

              {/* Consultation Card */}
              <div className="border border-slate-200 rounded-2xl p-5 hover:border-slate-300 transition-all bg-slate-50/50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      Confirmed • Aug 5, 2026
                    </span>
                    <h4 className="text-sm font-black text-slate-900 mt-1.5">
                      Review commercial property lease agreement in Lekki Phase 1
                    </h4>
                    <p className="text-xs text-slate-500 font-medium">
                      {isLawyer ? "Client: Tunde Bakare" : "Counsel: Barrister Amaka Okonkwo (NBA Verified)"}
                    </p>
                  </div>
                  <div className="text-right sm:text-right">
                    <span className="text-base font-black text-slate-900">₦45,000</span>
                    <span className="block text-[10px] text-slate-400 font-bold uppercase">Escrow Held</span>
                  </div>
                </div>

                <div className="pt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                    <Clock size={15} className="text-slate-400" />
                    10:00 AM - 11:00 AM (WAT)
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href="https://meet.jit.si/NigeriaLegalConsultation_101"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <Video size={14} /> Join Video Room
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link
                href="/search"
                className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <Scale size={20} />
                </div>
                <h4 className="text-sm font-black text-slate-900 group-hover:text-emerald-600 transition-colors">
                  Find Verified Lawyers
                </h4>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Search across Lagos, Abuja, Port Harcourt and 36 states by practice area.
                </p>
              </Link>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-500 hover:shadow-md transition-all group">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <ShieldCheck size={20} />
                </div>
                <h4 className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                  NDPA Data Protection
                </h4>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Attorney-client privilege and cryptographic security compliant with Nigeria legal regulations.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column (1 Col): Account & Identity */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
                Verified Account Details
              </h3>
              <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100">
                <div className="w-12 h-12 rounded-full bg-emerald-600 text-white font-black text-lg flex items-center justify-center shrink-0">
                  {user.full_name?.charAt(0) || "U"}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-900 truncate">{user.full_name}</p>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-slate-100 text-slate-700">
                    Role: {user.role}
                  </span>
                </div>
              </div>

              <div className="pt-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Auth Provider</span>
                  <span className="font-bold text-slate-800 flex items-center gap-1 capitalize">
                    {user.auth_provider === "google" && <GoogleIcon className="w-3.5 h-3.5" />}
                    {user.auth_provider || "Email/Password"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Jurisdiction</span>
                  <span className="font-bold text-slate-800">Federal Republic of Nigeria</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">NDPA Status</span>
                  <span className="font-bold text-emerald-600">Consent Recorded</span>
                </div>
              </div>
            </div>

            {/* Platform Help & Compliance */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-3xl shadow-lg space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wide">
                <Sparkles size={16} /> Wigally Guarantee
              </div>
              <h4 className="text-sm font-black leading-snug">
                100% Escrow Protection for Consultations
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                Funds are held securely until your consultation session concludes successfully.
              </p>
              <Link
                href="/search"
                className="inline-block mt-2 text-xs font-bold text-amber-300 hover:text-amber-200 underline"
              >
                Learn more about escrow →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
