"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck, Stamp, Upload } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function LawyerSealPage() {
  const { user, loading, authFetch } = useAuth();
  const router = useRouter();

  const [practiceYear, setPracticeYear] = useState(2026);
  const [bpfPaid, setBpfPaid] = useState(true);
  const [cpdPoints, setCpdPoints] = useState(5);
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
      if (!user?.lawyer_id) return;
      try {
        const response = await authFetch(`/api/compliance/practice-seal/check?lawyer_id=${encodeURIComponent(user.lawyer_id)}`);
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

    if (!user?.lawyer_id) {
      setErrorMessage("Your account is not linked to a lawyer profile.");
      return;
    }

    if (!sealFile) {
      setErrorMessage("Please upload your most recent stamp/seal document.");
      return;
    }

    setIsSubmitting(true);
    try {
      const params = new URLSearchParams({
        lawyer_id: user.lawyer_id,
        practice_year: String(practiceYear),
        bpf_paid: String(bpfPaid),
        cpd_points: String(cpdPoints),
      });

      const formData = new FormData();
      formData.append("seal_document", sealFile);

      const response = await authFetch(`/api/compliance/practice-seal/upload?${params.toString()}`, {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();
      if (!response.ok) {
        setErrorMessage(payload?.detail || "Failed to upload stamp/seal.");
        return;
      }

      setSuccessMessage(`Stamp & Seal ${payload.practice_year} uploaded successfully.`);

      const refreshed = await authFetch(`/api/compliance/practice-seal/check?lawyer_id=${encodeURIComponent(user.lawyer_id)}`);
      if (refreshed.ok) {
        setCurrentStatus(await refreshed.json());
      }
    } catch (error) {
      console.error(error);
      setErrorMessage("Unexpected error while uploading stamp/seal.");
    } finally {
      setIsSubmitting(false);
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
    <div className="flex-1 bg-slate-50 py-10 px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800">Annual Stamp &amp; Seal</h1>
          <p className="text-slate-500 mt-2">
            Upload your latest NBA stamp/seal record with BPF and CPD status. The document remains private and encrypted at rest.
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-slate-800">Current Public Trust Status</h2>
          </div>

          {!currentStatus ? (
            <p className="text-sm text-slate-500">No seal status found yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-slate-500">Seal Year</p>
                <p className="font-bold text-slate-800">{currentStatus.seal_year || "N/A"}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-slate-500">CPD Compliance</p>
                <p className="font-bold text-slate-800">{currentStatus.cpd_compliant ? "Compliant" : "Pending"}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-slate-500">Client Badge</p>
                <p className="font-bold text-slate-800">{currentStatus.has_valid_seal ? "Visible" : "Hidden"}</p>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={onUpload} className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-3">
            <Stamp className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-slate-800">Upload New Stamp &amp; Seal</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Practice Year</label>
              <input
                type="number"
                min="2025"
                max="2030"
                value={practiceYear}
                onChange={(event) => setPracticeYear(Number(event.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">CPD Points</label>
              <input
                type="number"
                min="0"
                max="100"
                value={cpdPoints}
                onChange={(event) => setCpdPoints(Number(event.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={bpfPaid}
              onChange={(event) => setBpfPaid(event.target.checked)}
              className="w-4 h-4"
            />
            BPF paid for selected year
          </label>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Seal Document (PDF/JPG/PNG)</label>
            <input
              type="file"
              accept="application/pdf,image/png,image/jpeg"
              onChange={(event) => setSealFile(event.target.files?.[0] || null)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium"
            />
          </div>

          {errorMessage && <p className="text-sm text-rose-600 font-medium">{errorMessage}</p>}
          {successMessage && <p className="text-sm text-emerald-700 font-medium">{successMessage}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl transition-colors"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Upload Stamp &amp; Seal
          </button>
        </form>
      </div>
    </div>
  );
}
