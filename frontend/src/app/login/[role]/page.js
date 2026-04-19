"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Mail, Lock, AlertCircle } from "lucide-react";

const ROLE_CONFIG = {
  lawyer: {
    title: "Lawyer Login",
    subtitle: "Log in to manage your cases, clients, and consultations.",
    alternateText: "Need a lawyer account?",
    alternateHref: "/signup/lawyer",
    accentLabel: "Lawyer Portal",
    accentLabelClass: "bg-emerald-100 text-emerald-700",
    focusRingClass: "focus:ring-emerald-500",
    buttonClass: "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30",
  },
  client: {
    title: "Client Login",
    subtitle: "Log in to manage your consultations and legal requests.",
    alternateText: "Need a client account?",
    alternateHref: "/signup/client",
    accentLabel: "Client Portal",
    accentLabelClass: "bg-indigo-100 text-indigo-700",
    focusRingClass: "focus:ring-indigo-500",
    buttonClass: "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30",
  },
};

export default function RoleLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const router = useRouter();
  const params = useParams();

  const role = typeof params?.role === "string" ? params.role : "";
  const config = useMemo(() => ROLE_CONFIG[role], [role]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const success = await login(email, password);
      if (success) {
        router.push("/dashboard");
      } else {
        setError("Invalid email or password");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!config) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center p-6 bg-slate-50 md:bg-white pb-24 md:pb-6">
        <div className="w-full max-w-md bg-white md:bg-slate-50 md:shadow-xl md:border border-slate-100 rounded-3xl p-8 text-center">
          <h1 className="text-2xl font-black text-slate-900">Invalid login route</h1>
          <p className="text-slate-500 font-medium mt-2">Choose either lawyer or client login.</p>
          <Link href="/login" className="inline-block mt-6 text-emerald-600 font-bold hover:text-emerald-500">
            Back to login options
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center p-6 bg-slate-50 md:bg-white pb-24 md:pb-6">
      <div className="w-full max-w-md bg-white md:bg-slate-50 md:shadow-xl md:border border-slate-100 rounded-3xl p-8">
        <div className="text-center mb-8">
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide mb-3 ${config.accentLabelClass}`}>
            {config.accentLabel}
          </span>
          <h1 className="text-3xl font-black text-slate-900">{config.title}</h1>
          <p className="text-slate-500 font-medium mt-2">{config.subtitle}</p>
        </div>

        {error && (
          <div className="bg-rose-50 text-rose-600 p-4 rounded-xl flex items-start gap-3 mb-6 font-medium text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase ml-2 mb-1 block">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Mail size={20} />
              </div>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={`w-full pl-11 pr-4 py-4 rounded-2xl bg-white md:bg-white border md:border-none focus:outline-none focus:ring-2 ${config.focusRingClass} font-medium text-slate-900 shadow-sm`}
                placeholder="name@example.com"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-end mb-1 px-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Password</label>
              <Link href="/forgot-password" className="text-xs font-bold text-emerald-600 hover:text-emerald-500">
                Forgot?
              </Link>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Lock size={20} />
              </div>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={`w-full pl-11 pr-4 py-4 rounded-2xl bg-white md:bg-white border md:border-none focus:outline-none focus:ring-2 ${config.focusRingClass} font-medium text-slate-900 shadow-sm`}
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !email || !password}
            className={`w-full py-4 mt-6 disabled:opacity-50 text-white font-bold rounded-2xl transition-transform active:scale-[0.98] shadow-lg flex items-center justify-center gap-2 ${config.buttonClass}`}
          >
            {loading && <Loader2 className="animate-spin w-5 h-5" />}
            Sign In
          </button>
        </form>

        <div className="mt-8 text-center text-sm font-medium text-slate-500">
          {config.alternateText} <Link href={config.alternateHref} className="font-bold hover:opacity-80 text-slate-800">Sign Up</Link>
        </div>

        <div className="mt-3 text-center text-sm font-medium text-slate-500">
          <Link href="/login" className="text-slate-600 font-semibold hover:text-slate-800">Change role</Link>
        </div>
      </div>
    </div>
  );
}
