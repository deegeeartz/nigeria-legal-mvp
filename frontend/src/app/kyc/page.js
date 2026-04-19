"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, Upload } from "lucide-react";

export default function KycPage() {
  const { user, loading, authFetch } = useAuth();
  const router = useRouter();

  const [enrollmentNumber, setEnrollmentNumber] = useState("");
  const [nin, setNin] = useState("");
  const [certificateFile, setCertificateFile] = useState(null);

  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [verifyingNin, setVerifyingNin] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
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
          setEnrollmentNumber(payload.enrollment_number || "");
        }
      } catch (error) {
        console.error(error);
      }
    };

    void loadStatus();
  }, [authFetch, user?.lawyer_id]);

  const verifyNin = async () => {
    if (!nin.trim()) {
      setErrorMessage("Please enter a NIN before verification.");
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
        setErrorMessage(detail.detail || "NIN verification failed.");
        return;
      }

      const payload = await response.json();
      setStatus(payload);
      setSuccessMessage(payload.nin_verified ? "NIN verification succeeded." : "NIN is invalid.");
    } catch (error) {
      console.error(error);
      setErrorMessage("NIN verification failed.");
    } finally {
      setVerifyingNin(false);
    }
  };

  const submitKyc = async (event) => {
    event.preventDefault();
    if (!certificateFile) {
      setErrorMessage("Please attach your certificate file.");
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
      setSuccessMessage("KYC submitted successfully and is now pending admin review.");
    } catch (error) {
      console.error(error);
      setErrorMessage("KYC submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex-1 flex justify-center items-center">
        <Loader2 className="animate-spin text-emerald-500 w-10 h-10" />
      </div>
    );
  }

  if (user.role !== "lawyer") {
    return null;
  }

  return (
    <div className="flex-1 bg-slate-50 p-6 md:p-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-black text-slate-900">Lawyer KYC Submission</h1>
        <p className="text-slate-600 mt-2 mb-8">Submit your certificate and verify NIN for review.</p>

        {errorMessage && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</div>}
        {successMessage && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{successMessage}</div>}

        <div className="bg-white border border-slate-100 rounded-2xl p-6 mb-6">
          <h2 className="font-bold text-slate-800 mb-2">Current Status</h2>
          {status ? (
            <div className="text-sm text-slate-600 space-y-1">
              <p>KYC Status: <span className="font-semibold">{status.kyc_submission_status}</span></p>
              <p>NIN Verified: <span className="font-semibold">{status.nin_verified ? "Yes" : "No"}</span></p>
              <p>NBA Verified: <span className="font-semibold">{status.nba_verified ? "Yes" : "No"}</span></p>
              <p>BVN Verified: <span className="font-semibold">{status.bvn_verified ? "Yes" : "No"}</span></p>
              <p>Last Update: <span className="font-semibold">{status.updated_on}</span></p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Status not available yet.</p>
          )}
        </div>

        <form onSubmit={submitKyc} className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4">
          <input
            type="text"
            value={enrollmentNumber}
            onChange={(event) => setEnrollmentNumber(event.target.value)}
            placeholder="NBA Enrollment Number / SCN"
            required
            className="w-full px-4 py-3 rounded-xl border border-slate-200"
          />

          <div className="flex flex-col md:flex-row gap-3">
            <input
              type="text"
              value={nin}
              onChange={(event) => setNin(event.target.value)}
              placeholder="NIN (11 digits)"
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200"
            />
            <button
              type="button"
              onClick={verifyNin}
              disabled={verifyingNin}
              className="px-4 py-3 rounded-xl border border-emerald-300 text-emerald-700 font-semibold hover:bg-emerald-50 disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {verifyingNin ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              Verify NIN
            </button>
          </div>

          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            onChange={(event) => setCertificateFile(event.target.files?.[0] || null)}
            required
            className="w-full px-4 py-3 rounded-xl border border-slate-200"
          />

          <button
            type="submit"
            disabled={submitting}
            className="w-full px-4 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
            {submitting ? "Submitting..." : "Submit KYC"}
          </button>
        </form>
      </div>
    </div>
  );
}
