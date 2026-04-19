"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AlertCircle, Loader2, UserPlus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { apiUrl } from "@/lib/api";

const ROLE_CONFIG = {
  client: {
    title: "Client Signup",
    subtitle: "Create your client account to book legal consultations.",
    requiresLawyerId: false,
    loginHref: "/login/client",
    accentLabel: "Client Onboarding",
    accentLabelClass: "bg-indigo-100 text-indigo-700",
    focusRingClass: "focus:ring-indigo-500",
    buttonClass: "bg-indigo-600 hover:bg-indigo-500",
  },
  lawyer: {
    title: "Lawyer Signup",
    subtitle: "Create your lawyer account to serve and manage clients.",
    requiresLawyerId: true,
    loginHref: "/login/lawyer",
    accentLabel: "Lawyer Onboarding",
    accentLabelClass: "bg-emerald-100 text-emerald-700",
    focusRingClass: "focus:ring-emerald-500",
    buttonClass: "bg-emerald-600 hover:bg-emerald-500",
  },
};

export default function RoleSignupPage() {
  const { login } = useAuth();
  const router = useRouter();
  const params = useParams();

  const role = typeof params?.role === "string" ? params.role : "";
  const config = useMemo(() => ROLE_CONFIG[role], [role]);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [lawyerId, setLawyerId] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!config) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const payload = {
        email,
        password,
        full_name: fullName,
        role,
        ...(config.requiresLawyerId ? { lawyer_id: lawyerId.trim() } : {}),
      };

      const response = await fetch(apiUrl("/api/auth/signup"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        setError(detail.detail || "Signup failed. Please check your details.");
        return;
      }

      const authenticated = await login(email, password);
      if (!authenticated) {
        setError("Account created, but auto-login failed. Please login manually.");
        router.push(config.loginHref);
        return;
      }

      router.push("/dashboard");
    } catch (submitError) {
      console.error(submitError);
      setError("Unexpected error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!config) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50 pb-24 md:pb-6">
        <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-100 shadow-sm p-8 text-center">
          <h1 className="text-2xl font-black text-slate-900">Invalid signup route</h1>
          <p className="text-slate-500 mt-2">Choose either lawyer or client signup.</p>
          <Link href="/signup" className="inline-block mt-6 text-emerald-600 font-semibold">
            Back to signup options
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-slate-50 pb-24 md:pb-6">
      <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
        <div className="text-center mb-8">
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide mb-3 ${config.accentLabelClass}`}>
            {config.accentLabel}
          </span>
          <h1 className="text-3xl font-black text-slate-900">{config.title}</h1>
          <p className="text-slate-500 mt-2">{config.subtitle}</p>
        </div>

        {error && (
          <div className="mb-6 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-700 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form className="space-y-4" onSubmit={onSubmit}>
          <input
            type="text"
            required
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Full name"
            className={`w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 ${config.focusRingClass}`}
          />

          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            className={`w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 ${config.focusRingClass}`}
          />

          <input
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password (upper/lower/number/special)"
            className={`w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 ${config.focusRingClass}`}
          />

          {config.requiresLawyerId && (
            <input
              type="text"
              required
              value={lawyerId}
              onChange={(event) => setLawyerId(event.target.value)}
              placeholder="Linked Lawyer ID (e.g. lw_004)"
              className={`w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 ${config.focusRingClass}`}
            />
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full mt-2 px-4 py-3 rounded-xl text-white font-bold disabled:opacity-70 flex items-center justify-center gap-2 ${config.buttonClass}`}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="text-sm text-slate-500 text-center mt-6">
          Already have an account? <Link href={config.loginHref} className="text-slate-800 font-semibold hover:opacity-80">Log In</Link>
        </p>

        <p className="text-sm text-slate-500 text-center mt-3">
          <Link href="/signup" className="text-slate-600 font-semibold">Change role</Link>
        </p>
      </div>
    </div>
  );
}
