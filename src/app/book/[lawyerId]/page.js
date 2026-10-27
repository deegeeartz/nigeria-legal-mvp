"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Scale,
  ShieldCheck,
  Calendar,
  Clock,
  Lock,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  Briefcase
} from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function BookConsultationPage() {
  const { lawyerId } = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [lawyer, setLawyer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scheduledFor, setScheduledFor] = useState("");
  const [summary, setSummary] = useState("");
  const [matterType, setMatterType] = useState("Contract / Commercial Review");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookedSuccess, setBookedSuccess] = useState(false);

  useEffect(() => {
    async function loadLawyer() {
      try {
        const res = await fetch("/api/lawyers");
        if (res.ok) {
          const list = await res.json();
          const found = list.find((l) => l.lawyer_id === lawyerId);
          setLawyer(found || null);
        }
      } catch (err) {
        console.error("Failed to load lawyer:", err);
      } finally {
        setLoading(false);
      }
    }
    loadLawyer();
  }, [lawyerId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!summary.trim() || !scheduledFor) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lawyer_id: lawyerId,
          scheduled_for: scheduledFor,
          summary: `${matterType}: ${summary.trim()}`
        })
      });

      if (res.ok) {
        setBookedSuccess(true);
        setTimeout(() => {
          router.push("/dashboard");
        }, 1800);
      }
    } catch (err) {
      console.error("Booking error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-6">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/search"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 mb-6 transition-colors"
        >
          <ArrowLeft size={14} /> Back to Directory
        </Link>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-slate-950 text-white p-8 border-b border-slate-800">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block mb-1">
                  Confidential Intake & Consultation
                </span>
                <h1 className="text-2xl font-black text-white">
                  {lawyer ? lawyer.full_name : "Legal Practitioner"}
                </h1>
                <p className="text-slate-300 text-xs sm:text-sm mt-1">
                  {lawyer?.tier?.replaceAll("_", " ") || "Verified Legal Counsel"} • {lawyer?.state || "Nigeria"}
                </p>
              </div>

              <div className="w-14 h-14 rounded-2xl bg-slate-900 text-amber-400 font-black flex items-center justify-center text-xl shrink-0 border border-slate-800">
                {lawyer?.full_name?.charAt(0) || "L"}
              </div>
            </div>

            {/* Professional Ethics Compliance Pill */}
            <div className="mt-6 pt-4 border-t border-slate-800 flex flex-wrap items-center gap-4 text-xs text-slate-300">
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <ShieldCheck size={14} /> NBA Enrolled & Rule 10 Verified
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <Lock size={13} className="text-amber-400" /> Escrow Protected Retainer
              </span>
            </div>
          </div>

          {bookedSuccess ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 size={36} />
              </div>
              <h2 className="text-2xl font-black text-slate-900">Consultation Scheduled!</h2>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                Your consultation request has been logged. Matter documents and secure case chat are available in your client dashboard.
              </p>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 max-w-md mx-auto">
                <strong>Consultation Channel:</strong> In-app video conferencing is currently on hold. Sessions proceed via confidential attorney-client chat and document review.
              </div>
              <div className="pt-4">
                <Link
                  href="/dashboard"
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md inline-block"
                >
                  Go to Dashboard
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              {/* Consultation Format Notice */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-2.5">
                <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-900 block">Consultation Format: Secure Case Chat & Document Review</span>
                  <span className="text-slate-500 text-[11px]">
                    In-app video conferencing is currently on hold. Counsel will review your intake details and provide advice via confidential case messaging and document markup.
                  </span>
                </div>
              </div>

              {/* Matter Category */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5 uppercase tracking-wider">
                  Area of Legal Concern
                </label>
                <select
                  value={matterType}
                  onChange={(e) => setMatterType(e.target.value)}
                  className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Commercial & Property Lease">Commercial & Property Lease</option>
                  <option value="Tenancy & Recovery of Premises">Tenancy & Recovery of Premises</option>
                  <option value="Corporate, CAC & Founder Vesting">Corporate, CAC & Founder Vesting</option>
                  <option value="Employment & Labour Dispute">Employment & Labour Dispute</option>
                  <option value="Civil & Fundamental Rights">Civil & Fundamental Rights</option>
                  <option value="Family & Estate Planning">Family & Estate Planning</option>
                </select>
              </div>

              {/* Brief Summary */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5 uppercase tracking-wider">
                  Summary of Legal Matter *
                </label>
                <textarea
                  required
                  rows={4}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Outline the facts, dates, agreements, or notices involved. Information submitted is subject to attorney-client confidentiality."
                  className="w-full p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Consultation Date / Time */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5 uppercase tracking-wider">
                  Preferred Date & Time *
                </label>
                <input
                  required
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                  className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Remuneration & Escrow Notice */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <Lock size={14} className="text-emerald-600" />
                  <span>Rule 10 & Remuneration Order Escrow Standard</span>
                </div>
                <p className="leading-relaxed">
                  In accordance with the Legal Practitioners Remuneration Order (LPRO) 2023, consultation fees and retainers are agreed privately during confidential intake and held in escrow until advice is delivered.
                </p>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-600/30 transition-all active:scale-98 flex items-center justify-center gap-2"
              >
                {isSubmitting ? "Submitting Intake..." : "Confirm & Request Consultation"}
                <ChevronRight size={16} />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
