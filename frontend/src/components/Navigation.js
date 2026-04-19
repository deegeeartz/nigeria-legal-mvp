"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Home, Search, Bell, BriefcaseBusiness, MessageSquare, User, ShieldAlert } from "lucide-react";

export function Navigation() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const links = [
    { href: "/", label: "Home", icon: Home },
    { href: "/search", label: "Find Lawyers", icon: Search },
    ...(user ? [{ href: "/messages", label: "Messages", icon: MessageSquare }] : []),
    ...(user ? [{ href: "/consultations", label: "Consultations", icon: BriefcaseBusiness }] : []),
    ...(user?.role === "lawyer" ? [{ href: "/kyc", label: "KYC", icon: User }] : []),
    ...(user ? [{ href: "/notifications", label: "Notifications", icon: Bell }] : []),
    ...(user ? [{ href: "/dashboard", label: "Dashboard", icon: User }] : []),
    ...(user?.role === "admin" ? [{ href: "/admin/audit", label: "Audit Log", icon: ShieldAlert }] : []),
  ];

  return (
    <>
      {/* Desktop Header Navigation */}
      <header className="hidden md:flex items-center justify-between px-8 py-4 bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-200">
        <div className="flex items-center gap-6">
          <Link href="/">
            <h1 className="text-2xl font-black bg-gradient-to-r from-emerald-600 to-teal-400 bg-clip-text text-transparent">
              Legal MVP
            </h1>
          </Link>
          <nav className="flex gap-4">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`font-medium transition-colors ${
                  pathname === link.href ? "text-emerald-600" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-slate-700">{user.full_name}</span>
              <button onClick={logout} className="px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 rounded-full transition-colors">
                Log Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">
                Log In
              </Link>
              <Link href="/signup" className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-full shadow-sm shadow-emerald-200 transition-all active:scale-95">
                Get Started
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Mobile Bottom Tab Bar for PWA */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 pb-safe pt-2 px-4 flex justify-between z-50">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center p-2 rounded-xl transition-all ${
                isActive ? "text-emerald-600" : "text-slate-400"
              }`}
            >
              <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium mt-1">{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
