"use client";

import Link from "next/link";

export default function SignupPage() {
  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-slate-50 pb-24 md:pb-6">
      <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-slate-900">Create Account</h1>
          <p className="text-slate-500 mt-2">Choose your role to create the right account.</p>
        </div>

        <div className="space-y-3">
          <Link
            href="/signup/lawyer"
            className="block w-full text-center py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl transition-transform active:scale-[0.98] shadow-lg shadow-emerald-600/30"
          >
            I am a lawyer
          </Link>
          <Link
            href="/signup/client"
            className="block w-full text-center py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl transition-transform active:scale-[0.98]"
          >
            I am a client
          </Link>
        </div>

        <p className="text-sm text-slate-500 text-center mt-6">
          Already have an account? <Link href="/login" className="text-emerald-600 font-semibold">Log In</Link>
        </p>
      </div>
    </div>
  );
}
