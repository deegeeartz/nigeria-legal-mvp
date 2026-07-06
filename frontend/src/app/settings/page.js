"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Shield, Download, Trash2, FileText, ChevronRight, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function SettingsPage() {
  const { user, authFetch, loading: authLoading } = useAuth();
  const router = useRouter();

  const [consents, setConsents] = useState([]);
  const [dsrRequests, setDsrRequests] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchPrivacyData = useCallback(async () => {
    if (!user) return;
    setLoadingData(true);
    try {
      const [consentsRes, dsrRes] = await Promise.all([
        authFetch("/api/compliance/consents/me"),
        authFetch("/api/compliance/dsr-requests/me"),
      ]);
      if (consentsRes.ok) setConsents(await consentsRes.json());
      if (dsrRes.ok) setDsrRequests(await dsrRes.json());
    } catch (err) {
      console.error("Failed to load privacy data:", err);
    } finally {
      setLoadingData(false);
    }
  }, [user, authFetch]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (user) {
      fetchPrivacyData();
    }
  }, [user, authLoading, router, fetchPrivacyData]);

  const submitDsrRequest = async (requestType, detail) => {
    setSubmitting(requestType);
    setSuccessMsg("");
    try {
      const res = await authFetch("/api/compliance/dsr-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_type: requestType, detail }),
      });
      if (res.ok) {
        setSuccessMsg(
          requestType === "export"
            ? "Data export request submitted. You will be notified when it's ready."
            : "Data deletion request submitted. An admin will review your request."
        );
        await fetchPrivacyData();
      }
    } catch (err) {
      console.error("DSR request failed:", err);
    } finally {
      setSubmitting("");
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const hasActiveConsent = consents.some((c) => c.consented && c.purpose === "platform_usage");
  const pendingDsr = dsrRequests.filter((d) => d.status === "submitted" || d.status === "in_review");

  return (
    <div className="flex-1 p-6 pb-24 md:pb-6 max-w-2xl mx-auto w-full">
      <h1 className="text-2xl font-black text-slate-900 mb-1">Settings</h1>
      <p className="text-slate-500 text-sm mb-8">Manage your account and privacy preferences.</p>

      {successMsg && (
        <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700 flex items-start gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Privacy & Data Section */}
      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
          <Shield className="w-5 h-5 text-emerald-600" />
          <h2 className="text-lg font-bold text-slate-900">Privacy & Data</h2>
        </div>

        {loadingData ? (
          <div className="p-8 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {/* Consent Status */}
            <div className="px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">Data Processing Consent</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {hasActiveConsent
                    ? "You have consented to data processing under the NDPA."
                    : "No active consent recorded."}
                </p>
              </div>
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full ${
                  hasActiveConsent
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {hasActiveConsent ? "Active" : "Not Set"}
              </span>
            </div>

            {/* Consent History */}
            {consents.length > 0 && (
              <div className="px-6 py-4">
                <p className="text-sm font-semibold text-slate-800 mb-2">Consent History</p>
                <div className="space-y-2">
                  {consents.slice(0, 5).map((c) => (
                    <div
                      key={c.consent_event_id}
                      className="flex items-center gap-2 text-xs text-slate-500"
                    >
                      {c.consented ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                      )}
                      <span className="font-medium text-slate-700">{c.purpose}</span>
                      <span>•</span>
                      <span>{new Date(c.created_on).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>v{c.policy_version}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Data Export */}
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Download className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-sm font-semibold text-slate-800">Export My Data</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Download a copy of all your personal data (NDPA Right of Access).
                  </p>
                </div>
              </div>
              <button
                onClick={() => submitDsrRequest("export", "User requested data export from settings page")}
                disabled={!!submitting}
                className="text-sm font-semibold text-emerald-600 hover:text-emerald-500 flex items-center gap-1 disabled:opacity-50"
              >
                {submitting === "export" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Request <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {/* Data Deletion */}
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Trash2 className="w-4 h-4 text-rose-400" />
                <div>
                  <p className="text-sm font-semibold text-slate-800">Delete My Data</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Request erasure of your personal data (NDPA Right to Erasure).
                  </p>
                </div>
              </div>
              <button
                onClick={() => submitDsrRequest("deletion", "User requested data deletion from settings page")}
                disabled={!!submitting}
                className="text-sm font-semibold text-rose-600 hover:text-rose-500 flex items-center gap-1 disabled:opacity-50"
              >
                {submitting === "deletion" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Request <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {/* Pending DSR Requests */}
            {pendingDsr.length > 0 && (
              <div className="px-6 py-4">
                <p className="text-sm font-semibold text-slate-800 mb-2">Pending Requests</p>
                <div className="space-y-2">
                  {pendingDsr.map((d) => (
                    <div
                      key={d.dsr_request_id}
                      className="flex items-center gap-2 bg-amber-50 rounded-lg px-3 py-2"
                    >
                      <FileText className="w-4 h-4 text-amber-600" />
                      <span className="text-xs font-medium text-amber-800 capitalize">
                        {d.request_type} Request
                      </span>
                      <span className="text-xs text-amber-600">
                        — {d.status === "submitted" ? "Awaiting review" : "Under review"}
                      </span>
                      <span className="ml-auto text-xs text-amber-500">
                        {new Date(d.created_on).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Legal Links */}
      <section className="mt-6 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-50">
          <a
            href="/legal/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <span className="text-sm font-semibold text-slate-800">Privacy Policy</span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </a>
          <a
            href="/legal/cookie-consent"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <span className="text-sm font-semibold text-slate-800">Cookie & Storage Policy</span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </a>
        </div>
      </section>
    </div>
  );
}
