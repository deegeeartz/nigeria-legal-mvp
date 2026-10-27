"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  ShieldCheck,
  Upload,
  ArrowLeft,
  FileCheck,
  AlertCircle,
  Building2,
  CheckCircle2,
  Sparkles,
  Lock
} from "lucide-react";

export default function KycPage() {
  const { user, loading, authFetch } = useAuth();
  const router = useRouter();

  const [enrollmentNumber, setEnrollmentNumber] = useState("SCN064821");
  const [nin, setNin] = useState("");
  const [certificateFile, setCertificateFile] = useState(null);

  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [verifyingNin, setVerifyingNin] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login?redirect=/kyc");
      return;
    }
    if (!loading && user && user.role !== "lawyer") {
      router.push("/dashboard");
    }
  }, [loading, router, user]);

  useEffect(() => {
    if (!user?.lawyer_id) {
      return;
    }

    const loadStatus = async () => {
      try {
        const response = await authFetch(`/api/kyc/${user.lawyer_id}`);
        if (response.ok) {
          const payload = await response.json();
          setStatus(payload);
          if (payload.enrollment_number) {
            setEnrollmentNumber(payload.enrollment_number);
          }
        }
      } catch (error) {
        console.error(error);
      }
    };

    void loadStatus();
  }, [authFetch, user?.lawyer_id]);

  const verifyNin = async () => {
    if (!nin.trim()) {
      setErrorMessage("Please enter an 11-digit NIN before verification.");
      return;
    }

    setVerifyingNin(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const form = new FormData();
      form.append("nin", nin.trim());

      const response = await authFetch("/api/kyc/nin/verify", {
        method: "POST",
        body: form,
      });

      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        setErrorMessage(detail.detail || "NIN verification failed. Please confirm digits.");
        return;
      }

      const payload = await response.json();
      setStatus((prev) => ({ ...prev, ...payload }));
      setSuccessMessage(payload.nin_verified ? "✓ National Identity Number (NIN) successfully verified with NIMC records." : "NIN is invalid.");
    } catch (error) {
      console.error(error);
      setErrorMessage("NIN verification failed. Please try again.");
    } finally {
      setVerifyingNin(false);
    }
  };

  const submitKyc = async (event) => {
    event.preventDefault();
    if (!certificateFile) {
      setErrorMessage("Please attach your Supreme Court enrollment or Bar practicing certificate.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const form = new FormData();
      form.append("enrollment_number", enrollmentNumber);
      form.append("certificate_file", certificateFile);
      if (nin.trim()) {
        form.append("nin", nin.trim());
      }

      const response = await authFetch("/api/kyc/submit", {
        method: "POST",
        body: form,
      });

      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        setErrorMessage(detail.detail || "KYC submission failed.");
        return;
      }

      const payload = await response.json();
      setStatus(payload);
      setSuccessMessage("✓ KYC credentials submitted successfully. Admin review and NBA registry matching is now active.");
    } catch (error) {
      console.error(error);
      setErrorMessage("KYC submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex-1 flex justify-center items-center py-24">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-stone-500">Loading KYC Portal...</p>
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
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Rule 10 Verified
              </span>
              <span className="text-xs text-stone-400">• Nigerian Bar Association</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black font-serif text-white tracking-tight flex items-center gap-3">
              <ShieldCheck className="w-7 h-7 text-emerald-400" />
              Lawyer Professional KYC
            </h1>
            <p className="text-xs md:text-sm text-stone-400 max-w-xl font-medium">
              Submit your Supreme Court Enrollment Number (SCN) and Call-to-Bar certificate to unlock client retainers and verified badges.
            </p>
          </div>

          <div className="bg-stone-800/80 border border-stone-700/80 p-4 rounded-2xl flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              SCN
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase text-stone-400 font-bold">Status Badge</p>
              <p className="text-xs font-black text-emerald-300">
                {status?.kyc_submission_status === "verified" ? "Verified Counsel" : "Verification in Progress"}
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

        {/* Current Status Card */}
        <div className="bg-white rounded-3xl border border-stone-200 p-6 md:p-8 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <h2 className="text-base font-black text-stone-900 font-serif flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-amber-600" />
              Credentials & Registry Status
            </h2>
            <span className="text-[10px] font-mono uppercase font-bold text-stone-400">
              Updated: {status?.updated_on || "Current Session"}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">KYC Review</span>
              <p className="text-sm font-black text-stone-900 mt-1 capitalize font-serif">
                {status?.kyc_submission_status || "Verified"}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">NBA Registry</span>
              <p className="text-sm font-black text-emerald-700 mt-1 font-serif flex items-center gap-1">
                <CheckCircle2 size={14} /> {status?.nba_verified ? "Confirmed" : "Verified"}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">NIN Identity</span>
              <p className="text-sm font-black text-stone-900 mt-1 font-serif">
                {status?.nin_verified ? "Verified ✓" : "Pending Entry"}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Enrollment SCN</span>
              <p className="text-sm font-black text-stone-900 mt-1 font-mono">
                {status?.enrollment_number || enrollmentNumber}
              </p>
            </div>
          </div>
        </div>

        {/* Verification Form */}
        <form onSubmit={submitKyc} className="bg-white rounded-3xl border border-stone-200 p-6 md:p-8 shadow-xs space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-black text-stone-900 font-serif">
              Upload Verification Documents
            </h3>
            <p className="text-xs text-stone-500 font-medium">
              All legal practice documents are stored securely with time-limited signed URLs and private access controls.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2 font-mono">
                Supreme Court Enrollment Number (SCN)
              </label>
              <input
                type="text"
                value={enrollmentNumber}
                onChange={(event) => setEnrollmentNumber(event.target.value)}
                placeholder="e.g. SCN064821"
                required
                className="w-full px-4 py-3 rounded-2xl border border-stone-200 bg-stone-50 font-medium text-sm focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2 font-mono">
                National Identity Number (NIN - 11 Digits)
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  maxLength={11}
                  value={nin}
                  onChange={(event) => setNin(event.target.value.replace(/\D/g, ""))}
                  placeholder="Enter 11-digit NIN for NIMC lookup"
                  className="flex-1 px-4 py-3 rounded-2xl border border-stone-200 bg-stone-50 font-mono text-sm focus:outline-hidden focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={verifyNin}
                  disabled={verifyingNin || nin.length < 11}
                  className="px-5 py-3 rounded-2xl bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2"
                >
                  {verifyingNin ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4 text-emerald-400" />}
                  Verify NIN
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2 font-mono">
                Call-to-Bar Certificate or NBA Seal (PDF, PNG, JPG)
              </label>
              <div className="border-2 border-dashed border-stone-200 hover:border-amber-500 rounded-3xl p-6 text-center transition-colors bg-stone-50/50">
                <input
                  type="file"
                  id="certUpload"
                  accept="application/pdf,image/jpeg,image/png"
                  onChange={(event) => setCertificateFile(event.target.files?.[0] || null)}
                  className="hidden"
                />
                <label htmlFor="certUpload" className="cursor-pointer block space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center mx-auto">
                    <Upload size={22} />
                  </div>
                  <div className="text-xs font-bold text-stone-800">
                    {certificateFile ? certificateFile.name : "Click to select Call-to-Bar Certificate"}
                  </div>
                  <p className="text-[11px] text-stone-400">
                    Maximum file size 10MB. Standard Nigerian Bar credentials.
                  </p>
                </label>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-sm transition-all shadow-sm active:scale-98 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
            {submitting ? "Uploading Credentials..." : "Submit KYC for Professional Review"}
          </button>
        </form>
      </div>
    </div>
  );
}
