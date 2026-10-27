"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";
import { Mail, Lock, User, Loader2, AlertCircle, Briefcase, UserCheck, Scale, ArrowRight, ShieldCheck, LogIn, UserPlus } from "lucide-react";

export default function SignupPage() {
  const [role, setRole] = useState("client"); // "client" | "lawyer"
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { signup } = useAuth();
  const router = useRouter();

  const handleSignup = async (e) => {
    e.preventDefault();
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
        setError("Failed to create account. Please check your information.");
      }
    } catch (err) {
      setError("An unexpected error occurred during signup.");
    } finally {
      setLoading(false);
    }
  };

  const isLawyer = role === "lawyer";

  return (
    <div className="flex flex-col flex-1 items-center justify-center p-4 sm:p-6 bg-slate-50 md:bg-white pb-24 md:pb-10">
      <div className="w-full max-w-md bg-white md:bg-slate-50 md:shadow-xl md:border border-slate-200 rounded-3xl p-6 sm:p-8">
        
        {/* Intuitive Dual-Tab Header: Sign In vs Sign Up */}
        <div className="grid grid-cols-2 p-1 bg-slate-200/90 rounded-2xl mb-6 text-xs font-bold">
          <Link
            href={isLawyer ? "/login/lawyer" : "/login/client"}
            className="py-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-white/50 flex items-center justify-center gap-1.5 transition-colors"
          >
            <LogIn size={15} />
            <span>Already a Member? Sign In</span>
          </Link>
          <button
            type="button"
            className="py-2.5 rounded-xl bg-white text-slate-900 shadow-sm flex items-center justify-center gap-1.5 cursor-default"
          >
            <UserPlus size={15} />
            <span>Create Account</span>
          </button>
        </div>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-900 flex items-center justify-center text-amber-400 font-bold shadow-md shadow-slate-900/10 border border-slate-800 mb-3">
            <Scale size={24} strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-black text-slate-900">Create your Account</h1>
          <p className="text-slate-500 font-medium text-xs mt-1">
            Join Wigally Legal Platform in Nigeria
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
            <UserCheck size={16} /> I need a Lawyer
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
            <Briefcase size={16} /> I am a Lawyer
          </button>
        </div>

        {isLawyer && (
          <div className="bg-emerald-50/70 border border-emerald-200 p-3 rounded-2xl mb-6 flex items-start gap-2.5 text-emerald-800 text-xs">
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            <div>
              <p className="font-bold">Nigerian Bar Association (NBA) Onboarding</p>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                Sign in or register with Google to automatically create your verified counsel profile.
              </p>
            </div>
          </div>
        )}

        {/* Existing Member Notice Banner */}
        <div className="p-3 rounded-2xl bg-slate-100 border border-slate-200 text-slate-700 text-xs mb-6 flex items-center justify-between gap-2">
          <span>Already registered?</span>
          <Link
            href={isLawyer ? "/login/lawyer" : "/login/client"}
            className="font-bold text-slate-900 underline hover:text-indigo-700 flex items-center gap-1 shrink-0"
          >
            <span>Sign in to your portal</span>
            <ArrowRight size={12} />
          </Link>
        </div>

        {error && (
          <div className="bg-rose-50 text-rose-600 p-4 rounded-xl flex items-start gap-3 mb-6 font-medium text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Google Sign Up Button */}
        <div className="mb-6">
          <GoogleAuthButton
            role={role}
            mode="signup"
            label={`Sign up with Google as ${isLawyer ? "Lawyer" : "Client"}`}
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

        {/* Signup Form */}
        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase ml-2 mb-1 block">Full Name</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <User size={18} />
              </div>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={`w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white border border-slate-200 focus:outline-none focus:ring-2 font-medium text-slate-900 text-sm shadow-sm ${
                  isLawyer ? "focus:ring-emerald-500" : "focus:ring-indigo-500"
                }`}
                placeholder={isLawyer ? "Barrister Emeka Adeleke" : "Chinedu Obi"}
                required
              />
            </div>
          </div>

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
                placeholder={isLawyer ? "counsel@lawfirm.ng" : "client@domain.com"}
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase ml-2 mb-1 block">Password</label>
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
            disabled={loading || !fullName || !email || !password}
            className={`w-full py-3.5 mt-4 disabled:opacity-50 text-white font-bold rounded-2xl transition-transform active:scale-[0.98] shadow-lg flex items-center justify-center gap-2 text-sm ${
              isLawyer
                ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30"
                : "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30"
            }`}
          >
            {loading && <Loader2 className="animate-spin w-4 h-4" />}
            Create {isLawyer ? "Lawyer" : "Client"} Account
          </button>
        </form>

        {/* Footer Links */}
        <div className="mt-8 text-center text-xs font-medium text-slate-500">
          Already have an account?{" "}
          <Link
            href={isLawyer ? "/login/lawyer" : "/login/client"}
            className="font-bold text-slate-900 hover:underline inline-flex items-center gap-1"
          >
            Sign in as {isLawyer ? "Lawyer" : "Client"} <ArrowRight size={12} />
          </Link>
        </div>
      </div>
    </div>
  );
}
