"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";
import { Mail, Lock, Loader2, AlertCircle, Briefcase, UserCheck, Scale, ArrowRight, UserPlus, LogIn } from "lucide-react";

export default function LoginPage() {
  const [role, setRole] = useState("client"); // "client" | "lawyer"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
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

  const handleQuickFill = (demoEmail, demoPassword, targetRole) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    if (targetRole) setRole(targetRole);
  };

  const isLawyer = role === "lawyer";

  return (
    <div className="flex flex-col flex-1 items-center justify-center p-4 sm:p-6 bg-slate-50 md:bg-white pb-24 md:pb-10">
      <div className="w-full max-w-md bg-white md:bg-slate-50 md:shadow-xl md:border border-slate-200 rounded-3xl p-6 sm:p-8">
        
        {/* Intuitive Dual-Tab Header: Sign In vs Sign Up */}
        <div className="grid grid-cols-2 p-1 bg-slate-200/90 rounded-2xl mb-6 text-xs font-bold">
          <button
            type="button"
            className="py-2.5 rounded-xl bg-white text-slate-900 shadow-sm flex items-center justify-center gap-1.5 cursor-default"
          >
            <LogIn size={15} />
            <span>Sign In</span>
          </button>
          <Link
            href={isLawyer ? "/signup/lawyer" : "/signup/client"}
            className="py-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-white/50 flex items-center justify-center gap-1.5 transition-colors"
          >
            <UserPlus size={15} />
            <span>New Member? Sign Up</span>
          </Link>
        </div>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-900 flex items-center justify-center text-amber-400 font-bold shadow-md shadow-slate-900/10 border border-slate-800 mb-3">
            <Scale size={24} strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-black text-slate-900">Sign in to Wigally</h1>
          <p className="text-slate-500 font-medium text-xs mt-1">
            Access your verified legal consultations, documents & case portal
          </p>
        </div>

        {/* Role Toggle Switcher */}
        <div className="bg-slate-200/80 p-1 rounded-2xl grid grid-cols-2 gap-1 mb-6">
          <button
            type="button"
            onClick={() => setRole("client")}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              !isLawyer
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <UserCheck size={16} /> Client Portal
          </button>
          <button
            type="button"
            onClick={() => setRole("lawyer")}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              isLawyer
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Briefcase size={16} /> Lawyer Portal
          </button>
        </div>

        {/* Not a member intuitive callout banner */}
        <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs mb-6 flex items-center justify-between gap-2">
          <span>Not a member yet?</span>
          <Link
            href={isLawyer ? "/signup/lawyer" : "/signup/client"}
            className="font-bold underline hover:text-amber-950 flex items-center gap-1 shrink-0"
          >
            <span>Register as {isLawyer ? "Lawyer" : "Client"}</span>
            <ArrowRight size={12} />
          </Link>
        </div>

        {error && (
          <div className="bg-rose-50 text-rose-600 p-4 rounded-xl flex items-start gap-3 mb-6 font-medium text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Google Sign In Button */}
        <div className="mb-6">
          <GoogleAuthButton
            role={role}
            mode="signin"
            label={`Sign in with Google as ${isLawyer ? "Lawyer" : "Client"}`}
          />
          <div className="relative my-5 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <span className="relative bg-white md:bg-slate-50 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Or with email & password
            </span>
          </div>
        </div>

        {/* Quick Fill Demo Banner */}
        <div className="bg-slate-100 p-3.5 rounded-2xl border border-slate-200 mb-6">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">⚡ Quick Fill Demo</p>
          {isLawyer ? (
            <button
              type="button"
              onClick={() => handleQuickFill("amaka@example.com", "password123", "lawyer")}
              className="w-full text-left px-3 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 transition-colors flex items-center justify-between"
            >
              <span>Amaka Okonkwo (Senior Partner)</span>
              <span className="text-[10px] text-emerald-600 font-semibold underline">Use Demo</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleQuickFill("client@example.com", "password123", "client")}
              className="w-full text-left px-3 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-800 transition-colors flex items-center justify-between"
            >
              <span>Tunde Bakare (Client)</span>
              <span className="text-[10px] text-indigo-600 font-semibold underline">Use Demo</span>
            </button>
          )}
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase ml-2 mb-1 block">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Mail size={18} />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white border border-slate-200 focus:outline-none focus:ring-2 font-medium text-slate-900 text-sm shadow-sm ${
                  isLawyer ? "focus:ring-emerald-500" : "focus:ring-indigo-500"
                }`}
                placeholder={isLawyer ? "lawyer@firm.ng" : "client@domain.com"}
                required
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-end mb-1 px-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Password</label>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Lock size={18} />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white border border-slate-200 focus:outline-none focus:ring-2 font-medium text-slate-900 text-sm shadow-sm ${
                  isLawyer ? "focus:ring-emerald-500" : "focus:ring-indigo-500"
                }`}
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !email || !password}
            className={`w-full py-3.5 mt-4 disabled:opacity-50 text-white font-bold rounded-2xl transition-transform active:scale-[0.98] shadow-lg flex items-center justify-center gap-2 text-sm ${
              isLawyer
                ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30"
                : "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30"
            }`}
          >
            {loading && <Loader2 className="animate-spin w-4 h-4" />}
            Sign In as {isLawyer ? "Lawyer" : "Client"}
          </button>
        </form>

        {/* Footer Links */}
        <div className="mt-8 text-center text-xs font-medium text-slate-500">
          Don&apos;t have an account?{" "}
          <Link
            href={isLawyer ? "/signup/lawyer" : "/signup/client"}
            className="font-bold text-slate-900 hover:underline inline-flex items-center gap-1"
          >
            Create {isLawyer ? "Lawyer" : "Client"} Account <ArrowRight size={12} />
          </Link>
        </div>
      </div>
    </div>
  );
}
