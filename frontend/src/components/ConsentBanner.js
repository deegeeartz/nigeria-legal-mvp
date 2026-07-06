"use client";

import { useState } from "react";
import { Shield, ExternalLink } from "lucide-react";
import { useAuth } from "@/lib/auth";

/**
 * NDPR/NDPA Consent Banner - Blocks user interaction until consent is given.
 * 
 * Shown after signup/login if the user has not yet recorded consent.
 * Records consent via POST /api/compliance/consents.
 */
export default function ConsentBanner({ onConsented }) {
  const { authFetch } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleAccept = async () => {
    setSubmitting(true);
    setError("");

    try {
      const res = await authFetch("/api/compliance/consents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purpose: "platform_usage",
          lawful_basis: "consent",
          consented: true,
          policy_version: "1.0",
          metadata: {
            consent_type: "initial_registration",
            accepted_at: new Date().toISOString(),
          },
        }),
      });

      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        setError(detail.detail || "Failed to record consent. Please try again.");
        return;
      }

      // Signal parent that consent was given
      if (onConsented) {
        onConsented();
      }
    } catch (err) {
      console.error("Consent recording failed:", err);
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-7 h-7" />
            <h2 className="text-xl font-black">Data Privacy Consent</h2>
          </div>
          <p className="text-emerald-100 text-sm">
            Required under the Nigeria Data Protection Act (NDPA) 2023
          </p>
        </div>

        {/* Body */}
        <div className="px-8 py-6 space-y-4">
          <p className="text-slate-700 text-sm leading-relaxed">
            By using the Nigeria Legal Marketplace, you consent to the collection,
            processing, and secure storage of the following personal data:
          </p>

          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span><strong>Identity Information:</strong> Full name, email address, and phone number for account management.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span><strong>Legal Case Data:</strong> Consultation details, uploaded documents, and case summaries shared with your assigned lawyer.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span><strong>Verification Data:</strong> NIN or BVN (encrypted at rest) for identity verification of legal practitioners.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span><strong>Payment Data:</strong> Transaction records processed securely via Paystack (PCI-DSS Level 1).</span>
            </li>
          </ul>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <p className="text-xs text-slate-500 leading-relaxed">
              <strong>Your Rights:</strong> Under the NDPA, you have the right to access, correct,
              or request deletion of your personal data at any time. You can exercise these rights
              from the <strong>Settings → Privacy & Data</strong> section of your account.
            </p>
          </div>

          <a
            href="/legal/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-emerald-600 font-semibold hover:underline"
          >
            Read full Privacy Policy <ExternalLink className="w-3.5 h-3.5" />
          </a>

          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 pb-8">
          <button
            onClick={handleAccept}
            disabled={submitting}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-70 text-white font-bold rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-emerald-600/30"
          >
            {submitting ? "Recording consent..." : "I Accept — Continue to Platform"}
          </button>
          <p className="text-xs text-slate-400 text-center mt-3">
            You must accept to use the platform. Your consent is recorded and auditable.
          </p>
        </div>
      </div>
    </div>
  );
}
