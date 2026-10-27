"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Mail, Lock, User, AlertCircle, ShieldCheck } from "lucide-react";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";

const ROLE_CONFIG = {
  lawyer: {
    title: "Join as a Lawyer",
    subtitle: "Create your verified Nigerian legal practitioner account.",
    alternateText: "Already have a lawyer account?",
    alternateHref: "/login/lawyer",
    accentLabel: "Lawyer Registration",
    accentLabelClass: "bg-emerald-100 text-emerald-700",
    focusRingClass: "focus:ring-emerald-500",
    buttonClass: "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30",
  },
  client: {
    title: "Join as a Client",
    subtitle: "Connect with verified Nigerian lawyers and schedule consultations.",
    alternateText: "Already have a client account?",
    alternateHref: "/login/client",
    accentLabel: "Client Registration",
    accentLabelClass: "bg-indigo-100 text-indigo-700",
    focusRingClass: "focus:ring-indigo-500",
    buttonClass: "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30",
  },
};

export default function RoleSignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { signup } = useAuth();
  const router = useRouter();
  const params = useParams();

  const role = typeof params?.role === "string" ? params.role : "";
  const config = useMemo(() => ROLE_CONFIG[role], [role]);

  const handleSignup = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const success = await signup({
        full_name: fullName,
        email,
        password,
        role,
      });
      if (success) {
        router.push("/dashboard");
      } else {
        setError("Unable to complete registration. Please check your inputs.");
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
          <h1 className="text-2xl font-black text-slate-900">Invalid registration route</h1>
          <p className="text-slate-500 font-medium mt-2">Choose either lawyer or client registration.</p>
          <Link href="/signup" className="inline-block mt-6 text-emerald-600 font-bold hover:text-emerald-500">
            Back to registration options
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center p-4 sm:p-6 bg-slate-50 md:bg-white pb-24 md:pb-10">
      <div className="w-full max-w-md bg-white md:bg-slate-50 md:shadow-xl md:border border-slate-100 rounded-3xl p-6 sm:p-8">
        
        {/* Intuitive Dual-Tab Header: Sign In vs Sign Up */}
        <div className="grid grid-cols-2 p-1 bg-slate-200/90 rounded-2xl mb-6 text-xs font-bold">
          <Link
            href={config.alternateHref}
            className="py-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-white/50 flex items-center justify-center gap-1.5 transition-colors"
          >
            <span>Already a Member? Sign In</span>
          </Link>
          <button
            type="button"
            className="py-2.5 rounded-xl bg-white text-slate-900 shadow-sm flex items-center justify-center gap-1.5 cursor-default"
          >
            <span>Create Account</span>
          </button>
        </div>

        <div className="text-center mb-6">
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide mb-3 ${config.accentLabelClass}`}>
            {config.accentLabel}
          </span>
          <h1 className="text-3xl font-black text-slate-900">{config.title}</h1>
          <p className="text-slate-500 font-medium mt-2 text-sm">{config.subtitle}</p>
        </div>

        {role === "lawyer" && (
          <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl mb-6 flex items-start gap-2.5 text-emerald-900 text-xs">
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            <p>
              Joining as an NBA-recognized lawyer allows you to issue Nigerian digital practice seals and bill via verified escrow.
            </p>
          </div>
        )}

        {error && (
          <div className="bg-rose-50 text-rose-600 p-4 rounded-xl flex items-start gap-3 mb-6 font-medium text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Google Authentication */}
        <div className="mb-6">
          <GoogleAuthButton
            role={role}
            mode="signup"
            label={`Sign up as ${role === "lawyer" ? "Lawyer" : "Client"} with Google`}
          />
          <div className="relative my-5 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <span className="relative bg-white md:bg-slate-50 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Or sign up with email
            </span>
          </div>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase ml-2 mb-1 block">Full Name</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <User size={20} />
              </div>
              <input
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className={`w-full pl-11 pr-4 py-4 rounded-2xl bg-white border border-slate-200 focus:outline-none focus:ring-2 ${config.focusRingClass} font-medium text-slate-900 shadow-sm`}
                placeholder={role === "lawyer" ? "Barrister Adaeze Okoye" : "Adewale Adeleke"}
                required
              />
            </div>
          </div>

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
                className={`w-full pl-11 pr-4 py-4 rounded-2xl bg-white border border-slate-200 focus:outline-none focus:ring-2 ${config.focusRingClass} font-medium text-slate-900 shadow-sm`}
                placeholder="name@example.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase ml-2 mb-1 block">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Lock size={20} />
              </div>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={`w-full pl-11 pr-4 py-4 rounded-2xl bg-white border border-slate-200 focus:outline-none focus:ring-2 ${config.focusRingClass} font-medium text-slate-900 shadow-sm`}
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !fullName || !email || !password}
            className={`w-full py-4 mt-6 disabled:opacity-50 text-white font-bold rounded-2xl transition-transform active:scale-[0.98] shadow-lg flex items-center justify-center gap-2 ${config.buttonClass}`}
          >
            {loading && <Loader2 className="animate-spin w-5 h-5" />}
            Register as {role === "lawyer" ? "Lawyer" : "Client"}
          </button>
        </form>

        <div className="mt-8 text-center text-sm font-medium text-slate-500">
          {config.alternateText}{" "}
          <Link href={config.alternateHref} className="font-bold hover:opacity-80 text-slate-800">
            Sign In
          </Link>
        </div>

        <div className="mt-3 text-center text-sm font-medium text-slate-500">
          <Link href="/signup" className="text-slate-600 font-semibold hover:text-slate-800">
            Change account type
          </Link>
        </div>
      </div>
    </div>
  );
}
