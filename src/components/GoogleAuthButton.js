"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Loader2, CheckCircle2, ShieldCheck, Briefcase, UserCheck, X } from "lucide-react";

export function GoogleIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export function GoogleAuthButton({
  role = null, // "lawyer" | "client" | null
  mode = "signin", // "signin" | "signup"
  className = "",
  label = null,
  redirectTo = "/dashboard",
  onSuccess = null,
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(role || "client");
  const [customEmail, setCustomEmail] = useState("");
  const [customName, setCustomName] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { loginWithGoogle } = useAuth();
  const router = useRouter();

  // Known Google accounts available in dev / preview environment
  const googleAccounts = [
    {
      name: "Dicky",
      email: "dickysexix@gmail.com",
      avatarBg: "bg-indigo-600",
      avatarLetter: "D",
      subtitle: "Current Active Google Account",
    },
    {
      name: "Barrister Amaka Okonkwo",
      email: "amaka.lawyer@gmail.com",
      avatarBg: "bg-emerald-600",
      avatarLetter: "A",
      subtitle: "Verified Counsel (NBA Certified)",
    },
    {
      name: "Tunde Bakare",
      email: "tunde.client@gmail.com",
      avatarBg: "bg-blue-600",
      avatarLetter: "T",
      subtitle: "Business Client (Lekki, Lagos)",
    },
  ];

  const handleSelectAccount = async (account) => {
    setLoading(true);
    setError("");

    try {
      const activeRole = role || selectedRole;
      const res = await loginWithGoogle({
        email: account.email,
        full_name: account.name,
        role: activeRole,
      });

      if (res) {
        setModalOpen(false);
        if (onSuccess) {
          onSuccess(res);
        } else {
          router.push(redirectTo);
        }
      } else {
        setError("Failed to sign in with this Google account.");
      }
    } catch (err) {
      setError("An unexpected error occurred during Google authentication.");
    } finally {
      setLoading(false);
    }
  };

  const handleCustomSubmit = async (e) => {
    e.preventDefault();
    if (!customEmail) return;

    await handleSelectAccount({
      email: customEmail.trim(),
      name: customName.trim() || customEmail.split("@")[0],
    });
  };

  const buttonText =
    label ||
    (mode === "signup"
      ? role
        ? `Sign up as ${role === "lawyer" ? "Lawyer" : "Client"} with Google`
        : "Sign up with Google"
      : role
      ? `Continue as ${role === "lawyer" ? "Lawyer" : "Client"} with Google`
      : "Continue with Google");

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className={`w-full py-3.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-800 font-bold rounded-2xl shadow-sm transition-all flex items-center justify-center gap-3 active:scale-[0.99] group ${className}`}
      >
        <GoogleIcon className="w-5 h-5 shrink-0 group-hover:scale-110 transition-transform" />
        <span className="text-sm font-semibold">{buttonText}</span>
      </button>

      {/* Google Authentication Dialog Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center border border-slate-200">
                  <GoogleIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {mode === "signup" ? "Sign up with Google" : "Sign in with Google"}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">to continue to Wigally Legal Services</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[80vh] space-y-5">
              {/* Role Selection (If not explicitly locked by parent page) */}
              {!role && (
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                    Select your account type:
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedRole("client")}
                      className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                        selectedRole === "client"
                          ? "bg-indigo-50/80 border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm"
                          : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-black text-indigo-900 flex items-center gap-1.5">
                          <UserCheck className="w-4 h-4 text-indigo-600" /> Client
                        </span>
                        {selectedRole === "client" && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">Need legal advice or representation</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedRole("lawyer")}
                      className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                        selectedRole === "lawyer"
                          ? "bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm"
                          : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-black text-emerald-900 flex items-center gap-1.5">
                          <Briefcase className="w-4 h-4 text-emerald-600" /> Lawyer
                        </span>
                        {selectedRole === "lawyer" && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">Practicing Nigerian Legal Practitioner</p>
                    </button>
                  </div>
                </div>
              )}

              {/* Notice when role is locked */}
              {role && (
                <div
                  className={`p-3 rounded-2xl border flex items-center gap-3 ${
                    role === "lawyer"
                      ? "bg-emerald-50/60 border-emerald-200 text-emerald-900"
                      : "bg-indigo-50/60 border-indigo-200 text-indigo-900"
                  }`}
                >
                  <ShieldCheck className="w-5 h-5 shrink-0" />
                  <p className="text-xs font-medium">
                    Signing in as <span className="font-bold capitalize">{role}</span>. You will be redirected to the {role} dashboard upon authentication.
                  </p>
                </div>
              )}

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
                  {error}
                </div>
              )}

              {/* Account List */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Choose a Google Account
                </p>

                {googleAccounts.map((account, index) => (
                  <button
                    key={account.email}
                    type="button"
                    disabled={loading}
                    onClick={() => handleSelectAccount(account)}
                    className="w-full p-3.5 bg-slate-50/70 hover:bg-slate-100/90 border border-slate-200 rounded-2xl text-left transition-all flex items-center gap-3.5 group hover:border-slate-300"
                  >
                    <div
                      className={`w-10 h-10 rounded-full ${account.avatarBg} text-white font-bold flex items-center justify-center shrink-0 shadow-sm`}
                    >
                      {account.avatarLetter}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-900 truncate">{account.name}</p>
                        {index === 0 && (
                          <span className="px-1.5 py-0.5 text-[9px] font-extrabold uppercase bg-emerald-100 text-emerald-800 rounded-md">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate">{account.email}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{account.subtitle}</p>
                    </div>
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                    ) : (
                      <span className="text-xs font-bold text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        Select →
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Custom Google Account Option */}
              <div className="border-t border-slate-100 pt-3">
                {!showCustomInput ? (
                  <button
                    type="button"
                    onClick={() => setShowCustomInput(true)}
                    className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5"
                  >
                    <span>+ Use another Google account</span>
                  </button>
                ) : (
                  <form onSubmit={handleCustomSubmit} className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <p className="text-xs font-bold text-slate-800">Enter Google Account Details</p>
                    <div>
                      <input
                        type="email"
                        value={customEmail}
                        onChange={(e) => setCustomEmail(e.target.value)}
                        placeholder="yourname@gmail.com"
                        required
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        placeholder="Your Full Name (optional)"
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={loading || !customEmail}
                        className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-sm flex items-center justify-center gap-2"
                      >
                        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Continue as {role || selectedRole}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCustomInput(false)}
                        className="px-3 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 text-center">
              <p className="text-[11px] text-slate-400">
                By continuing, Google shares your name and email with Wigally.
                Compliant with Nigeria Data Protection Act (NDPA).
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
