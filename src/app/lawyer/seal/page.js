"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  ShieldCheck,
  Stamp,
  Upload,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Award,
  Sparkles,
  FileText
} from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function LawyerSealPage() {
  const { user, loading, authFetch } = useAuth();
  const router = useRouter();

  const [practiceYear, setPracticeYear] = useState(2026);
  const [bpfPaid, setBpfPaid] = useState(true);
  const [cpdPoints, setCpdPoints] = useState(12);
  const [sealFile, setSealFile] = useState(null);
  const [currentStatus, setCurrentStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login?redirect=/lawyer/seal");
      return;
    }
    if (!loading && user && user.role !== "lawyer") {
      router.push("/dashboard");
      return;
    }

    const loadSealStatus = async () => {
      const lawyerId = user?.lawyer_id || "lw_001";
      try {
        const response = await authFetch(
          `/api/compliance/practice-seal/check?lawyer_id=${encodeURIComponent(lawyerId)}`
        );
        if (response.ok) {
          setCurrentStatus(await response.json());
        }
      } catch (error) {
        console.error(error);
      }
    };

    if (user?.role === "lawyer") {
      void loadSealStatus();
    }
  }, [authFetch, loading, router, user]);

  const onUpload = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const lawyerId = user?.lawyer_id || "lw_001";

    if (!sealFile) {
      setErrorMessage("Please select your NBA stamp/seal proof file.");
      return;
    }

    setIsSubmitting(true);
    try {
      const params = new URLSearchParams({
        lawyer_id: lawyerId,
        practice_year: String(practiceYear),
        bpf_paid: String(bpfPaid),
        cpd_points: String(cpdPoints),
      });

      const formData = new FormData();
      formData.append("seal_document", sealFile);

      const response = await authFetch(
        `/api/compliance/practice-seal/upload?${params.toString()}`,
        {
          method: "POST",
          body: formData,
        }
      );

      const payload = await response.json();
      if (!response.ok) {
        setErrorMessage(payload?.detail || "Failed to upload stamp/seal.");
        return;
      }

      setSuccessMessage(`✓ NBA Practice Seal for ${payload.practice_year || practiceYear} updated successfully. Verified badge is active.`);

      const refreshed = await authFetch(
        `/api/compliance/practice-seal/check?lawyer_id=${encodeURIComponent(lawyerId)}`
      );
      if (refreshed.ok) {
        setCurrentStatus(await refreshed.json());
      }
    } catch (error) {
      console.error(error);
      setErrorMessage("Unexpected error while updating stamp/seal.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex-1 flex justify-center items-center py-24">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-stone-500">Verifying seal records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-stone-100/70 py-10 px-4 md:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-500 hover:text-stone-900 transition-colors"
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>

        {/* Header Banner */}
        <div className="bg-stone-900 text-stone-100 rounded-3xl p-6 md:p-8 border border-stone-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Rule 10 NBA Stamp
              </span>
              <span className="text-xs text-stone-400">• Annual Compliance</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black font-serif text-white tracking-tight flex items-center gap-3">
              <Stamp className="w-7 h-7 text-amber-400" />
              Digital Practice Seal &amp; Stamp
            </h1>
            <p className="text-xs md:text-sm text-stone-400 max-w-xl font-medium">
              Upload your valid Nigerian Bar Association annual stamp, verify Bar Practicing Fees (BPF), and log Continuing Professional Development (CPD) points.
            </p>
          </div>

          <div className="bg-stone-800/80 border border-stone-700/80 p-4 rounded-2xl flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              BPF
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase text-stone-400 font-bold">Seal Year</p>
              <p className="text-xs font-black text-amber-300">
                {currentStatus?.seal_year || "2026 Valid"}
              </p>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 font-medium">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 font-medium">
            {successMessage}
          </div>
        )}

        {/* Current Compliance Status */}
        <div className="bg-white rounded-3xl border border-stone-200 p-6 md:p-8 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <h2 className="text-base font-black text-stone-900 font-serif flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Current Public Badge &amp; Standing
            </h2>
            <span className="text-[10px] font-mono uppercase font-bold text-stone-400">
              Supreme Court Certified
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Active Seal Year</span>
              <p className="text-base font-black text-stone-900 mt-1 font-serif">
                {currentStatus?.seal_year || 2026}
              </p>
              <span className="text-[11px] text-emerald-700 font-semibold mt-1 inline-block">
                ✓ Bar Fee Paid
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">CPD Compliance</span>
              <p className="text-base font-black text-stone-900 mt-1 font-serif">
                {currentStatus?.cpd_compliant ? "12 Units (Satisfied)" : "Pending"}
              </p>
              <span className="text-[11px] text-stone-500 font-medium mt-1 inline-block">
                Mandatory Continuing Legal Ed
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Client Search Badge</span>
              <p className="text-base font-black text-emerald-700 mt-1 font-serif flex items-center gap-1.5">
                <CheckCircle2 size={16} /> Verified Seal &amp; Stamp
              </p>
              <span className="text-[11px] text-stone-500 font-medium mt-1 inline-block">
                Appears on your public profile
              </span>
            </div>
          </div>
        </div>

        {/* Upload Form */}
        <form onSubmit={onUpload} className="bg-white rounded-3xl border border-stone-200 p-6 md:p-8 shadow-xs space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-black text-stone-900 font-serif">
              Upload Updated Annual Seal Record
            </h3>
            <p className="text-xs text-stone-500 font-medium">
              Submit proof of BPF payment and NBA stamp receipt for the current practice calendar.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2 font-mono">
                Practice Year
              </label>
              <input
                type="number"
                min="2025"
                max="2030"
                value={practiceYear}
                onChange={(event) => setPracticeYear(Number(event.target.value))}
                className="w-full px-4 py-3 rounded-2xl border border-stone-200 bg-stone-50 font-medium text-sm focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2 font-mono">
                Earned CPD Points (Units)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={cpdPoints}
                onChange={(event) => setCpdPoints(Number(event.target.value))}
                className="w-full px-4 py-3 rounded-2xl border border-stone-200 bg-stone-50 font-medium text-sm focus:outline-hidden focus:border-amber-500"
              />
            </div>
          </div>

          <label className="flex items-center gap-2.5 text-xs font-bold text-stone-700 cursor-pointer bg-stone-50 p-4 rounded-2xl border border-stone-200">
            <input
              type="checkbox"
              checked={bpfPaid}
              onChange={(event) => setBpfPaid(event.target.checked)}
              className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
            />
            <span>I confirm Bar Practicing Fees (BPF) for {practiceYear} have been paid to the Supreme Court account.</span>
          </label>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2 font-mono">
              Stamp / Seal Document or NBA Receipt (PDF, PNG, JPG)
            </label>
            <div className="border-2 border-dashed border-stone-200 hover:border-amber-500 rounded-3xl p-6 text-center transition-colors bg-stone-50/50">
              <input
                type="file"
                id="sealUpload"
                accept="application/pdf,image/png,image/jpeg"
                onChange={(event) => setSealFile(event.target.files?.[0] || null)}
                className="hidden"
              />
              <label htmlFor="sealUpload" className="cursor-pointer block space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center mx-auto">
                  <Stamp size={22} />
                </div>
                <div className="text-xs font-bold text-stone-800">
                  {sealFile ? sealFile.name : "Click to select NBA Stamp & Seal File"}
                </div>
                <p className="text-[11px] text-stone-400">
                  PDF or high-resolution photo of official stamp sheet.
                </p>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-black text-sm transition-all shadow-sm active:scale-98 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
            {isSubmitting ? "Updating Seal..." : "Save & Verify Stamp Compliance"}
          </button>
        </form>
      </div>
    </div>
  );
}
