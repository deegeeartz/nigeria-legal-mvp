"use client";

import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-slate-50 pb-24 md:pb-6">
      <div className="max-w-xl w-full bg-white rounded-3xl border border-slate-100 p-8 text-center">
        <h1 className="text-2xl font-black text-slate-900">Password Reset Not Yet Enabled</h1>
        <p className="text-slate-600 mt-3">
          This environment does not yet include a backend password reset flow. Please contact support/admin for assisted account recovery.
        </p>
        <Link href="/login" className="inline-block mt-6 px-5 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-500">
          Back to Login
        </Link>
      </div>
    </div>
  );
}
