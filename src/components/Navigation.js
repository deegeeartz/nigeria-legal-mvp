"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import {
  Home,
  Search,
  Bell,
  BriefcaseBusiness,
  MessageSquare,
  User,
  ShieldAlert,
  Stamp,
  Scale,
  Sparkles,
  LogIn,
  LogOut,
  UserPlus,
  BookOpen
} from "lucide-react";
import { PWAInstallButton } from "@/components/pwa/PWAInstallButton";

export function Navigation() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const baseLinks = [
    { href: "/", label: "Home", icon: Home },
    { href: "/articles", label: "Articles", icon: BookOpen, badge: "Pulse" },
    { href: "/community", label: "Legal Lounge", icon: MessageSquare, badge: "Chat" },
    { href: "/search", label: "Find Lawyers", icon: Search },
    ...(user ? [{ href: "/dashboard", label: "Dashboard", icon: User }] : []),
    ...(user?.role === "lawyer" ? [{ href: "/kyc", label: "KYC", icon: ShieldAlert }] : []),
    ...(user?.role === "lawyer" ? [{ href: "/lawyer/seal", label: "Seal", icon: Stamp }] : []),
    ...(user ? [{ href: "/notifications", label: "Notifications", icon: Bell }] : []),
    ...(user?.role === "admin" ? [{ href: "/admin/audit", label: "Audit", icon: ShieldAlert }] : []),
  ];

  // Mobile bottom bar links: if logged in show core + Articles + Dashboard
  const mobileLinks = user
    ? [
        { href: "/", label: "Home", icon: Home },
        { href: "/articles", label: "Articles", icon: BookOpen, badge: "Pulse" },
        { href: "/community", label: "Lounge", icon: MessageSquare },
        { href: "/search", label: "Lawyers", icon: Search },
        { href: "/dashboard", label: "Portal", icon: User },
      ]
    : [
        { href: "/", label: "Home", icon: Home },
        { href: "/articles", label: "Articles", icon: BookOpen },
        { href: "/community", label: "Lounge", icon: MessageSquare },
        { href: "/login", label: "Sign In", icon: LogIn },
        { href: "/signup", label: "Join Free", icon: UserPlus, highlight: true },
      ];

  return (
    <>
      {/* Desktop Header Navigation */}
      <header className="hidden md:flex items-center justify-between px-6 lg:px-8 py-3 bg-stone-50/95 backdrop-blur-md sticky top-0 z-50 border-b border-stone-200">
        {/* Left: Logo & Instant Search */}
        <div className="flex items-center gap-5">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-stone-900 flex items-center justify-center text-amber-400 font-bold shadow-sm border border-stone-800 group-hover:scale-105 transition-transform">
              <Scale size={20} strokeWidth={2.5} />
            </div>
            <span className="text-2xl font-black text-stone-900 tracking-tight flex items-center gap-1 font-serif">
              Wigally<span className="w-2 h-2 rounded-full bg-amber-600 inline-block"></span>
            </span>
          </Link>

          {/* Facebook-style Search Input */}
          <div className="relative hidden lg:block w-56 xl:w-64">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search lawyers, cases..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.target.value.trim()) {
                  window.location.href = `/search?q=${encodeURIComponent(e.target.value.trim())}`;
                }
              }}
              className="w-full pl-9 pr-3 py-1.5 rounded-full bg-stone-200/60 border border-transparent focus:border-amber-600 focus:bg-white text-xs text-stone-900 placeholder:text-stone-500 focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Center: Navigation Tabs */}
        <nav className="flex items-center gap-1.5 lg:gap-2">
          {baseLinks.slice(0, 5).map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-xs font-bold transition-all flex items-center gap-1.5 py-1.5 px-3 rounded-full ${
                  isActive
                    ? "text-stone-950 bg-stone-200 shadow-2xs"
                    : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
                }`}
              >
                <Icon size={14} className={isActive ? "text-amber-800" : "text-stone-500"} />
                <span>{link.label}</span>
                {link.badge && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-700 text-white font-mono font-bold uppercase tracking-wider">
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right: Actions, Messages, Notifications, Profile */}
        <div className="flex items-center gap-2.5">
          <PWAInstallButton variant="header" />

          {user ? (
            <div className="flex items-center gap-2">
              {/* Facebook-style Messenger Button */}
              <Link
                href="/dashboard"
                title="Case Chat & Consultations"
                className="w-9 h-9 rounded-full bg-stone-200/80 hover:bg-stone-300 text-stone-800 flex items-center justify-center transition-colors relative"
              >
                <MessageSquare size={16} />
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-amber-600 text-white font-mono text-[9px] font-bold flex items-center justify-center">
                  2
                </span>
              </Link>

              {/* Facebook-style Notifications Bell */}
              <Link
                href="/notifications"
                title="Notifications"
                className="w-9 h-9 rounded-full bg-stone-200/80 hover:bg-stone-300 text-stone-800 flex items-center justify-center transition-colors relative"
              >
                <Bell size={16} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500" />
              </Link>

              {/* Profile Capsule */}
              <Link
                href="/dashboard"
                className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-stone-200/60 hover:bg-stone-200 border border-stone-200 transition-colors"
              >
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt=""
                    className="w-7 h-7 rounded-full object-cover border border-amber-600/50 shrink-0"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-stone-900 text-amber-400 font-bold flex items-center justify-center text-xs">
                    {user.full_name?.charAt(0) || "U"}
                  </div>
                )}
                <span className="text-xs font-bold text-stone-900 truncate max-w-[100px] font-serif">
                  {user.full_name?.split(" ")[0]}
                </span>
              </Link>

              <button
                onClick={logout}
                title="Log out"
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 rounded-lg transition-colors border border-stone-200"
              >
                <LogOut size={13} className="shrink-0" />
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-3.5 py-1.5 text-xs font-bold text-stone-700 hover:text-stone-900 hover:bg-stone-100 rounded-full transition-colors border border-stone-300"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="px-4 py-1.5 text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 rounded-full shadow-xs transition-all active:scale-95 flex items-center gap-1.5"
              >
                <UserPlus size={13} />
                <span>Join Free</span>
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-stone-50/95 backdrop-blur-md sticky top-0 z-40 border-b border-stone-200">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-stone-900 flex items-center justify-center text-amber-400 font-bold border border-stone-800 shadow-sm">
            <Scale size={18} strokeWidth={2.5} />
          </div>
          <span className="text-xl font-black text-stone-900 tracking-tight flex items-center gap-1 font-serif">
            Wigally<span className="w-1.5 h-1.5 rounded-full bg-amber-600 inline-block"></span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          {user ? (
            <Link
              href="/dashboard"
              className="text-xs font-semibold text-stone-800 bg-stone-200/80 px-2.5 py-1 rounded-md"
            >
              Portal
            </Link>
          ) : (
            <div className="flex items-center gap-1.5">
              <Link
                href="/login"
                className="text-[11px] font-bold text-stone-700 border border-stone-300 bg-white px-2 py-1 rounded-md"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="text-[11px] font-bold text-white bg-stone-900 px-2.5 py-1 rounded-md"
              >
                Join
              </Link>
            </div>
          )}
          <PWAInstallButton variant="header" />
        </div>
      </div>

      {/* Mobile Bottom Tab Bar for PWA */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-stone-50 border-t border-stone-200 pb-safe pt-2 px-2 flex justify-around z-50 shadow-lg">
        {mobileLinks.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center p-1.5 rounded-xl transition-all relative ${
                link.highlight
                  ? "text-amber-800 font-bold bg-amber-100/50 px-2.5"
                  : isActive
                  ? "text-stone-900 font-bold"
                  : "text-stone-500"
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium mt-0.5">{link.label}</span>
              {link.badge && (
                <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-amber-600" />
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
