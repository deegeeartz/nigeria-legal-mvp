"use client";

import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center p-6 bg-slate-50 md:bg-white pb-24 md:pb-6">
      <div className="w-full max-w-md bg-white md:bg-slate-50 md:shadow-xl md:border border-slate-100 rounded-3xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-slate-900">Welcome Back</h1>
          <p className="text-slate-500 font-medium mt-2">Choose your role to continue.</p>
        </div>

        <div className="space-y-3">
          <Link
            href="/login/lawyer"
            className="block w-full text-center py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl transition-transform active:scale-[0.98] shadow-lg shadow-emerald-600/30"
          >
            I am a lawyer
          </Link>
          <Link
            href="/login/client"
            className="block w-full text-center py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl transition-transform active:scale-[0.98]"
          >
            I am a client
          </Link>
        </div>

        <div className="mt-8 text-center text-sm font-medium text-slate-500">
          Don&apos;t have an account? <Link href="/signup" className="text-emerald-600 font-bold hover:text-emerald-500">Sign Up</Link>
        </div>
      </div>
    </div>
  );
}
