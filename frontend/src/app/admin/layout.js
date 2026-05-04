"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, FileText, Shield, BarChart3, Settings } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const navItems = [
  { name: "Overview", href: "/admin", icon: BarChart3 },
  { name: "KYC & Verification", href: "/admin/kyc", icon: Users },
  { name: "Audit Logs", href: "/admin/audit", icon: FileText },
  { name: "Compliance", href: "/admin/compliance", icon: Shield },
  { name: "Settings", href: "/admin/settings", icon: Settings },
];

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || (user.role !== "admin" && user.role !== "dpo"))) {
      router.push("/login/lawyer"); // redirect unauthorized
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!user || (user.role !== "admin" && user.role !== "dpo")) return null;

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex-shrink-0 border-r border-slate-800 flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white tracking-tight">Admin Hub</h2>
          <p className="text-xs text-emerald-400 mt-1">Nigeria Legal Marketplace</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/admin" && pathname?.startsWith(item.href));
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
                      isActive 
                        ? "bg-emerald-600/10 text-emerald-400" 
                        : "hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <item.icon size={18} className={isActive ? "text-emerald-400" : "text-slate-400"} />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold text-sm">
              {user.full_name?.charAt(0) || "A"}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{user.full_name}</p>
              <p className="text-xs text-slate-400 truncate capitalize">{user.role}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <header className="bg-white border-b border-slate-200 h-16 flex items-center px-8 shrink-0 shadow-sm z-10">
          <h1 className="text-lg font-bold text-slate-800">
            {navItems.find(i => pathname === i.href || (i.href !== "/admin" && pathname?.startsWith(i.href)))?.name || "Dashboard"}
          </h1>
        </header>
        <div className="flex-1 overflow-y-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
