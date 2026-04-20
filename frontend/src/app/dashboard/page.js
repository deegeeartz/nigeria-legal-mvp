"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Bell, BriefcaseBusiness, Loader2, MessageSquare, ShieldAlert, Stamp } from "lucide-react";

export default function DashboardPage() {
  const { user, loading, authFetch } = useAuth();
  const router = useRouter();
  const [consultations, setConsultations] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }

    if (loading || !user) {
      return;
    }

    const loadDashboard = async () => {
      setIsLoadingData(true);
      try {
        const [consultationRes, conversationRes, notificationRes] = await Promise.all([
          authFetch("/api/consultations"),
          authFetch("/api/conversations"),
          authFetch("/api/notifications"),
        ]);

        if (consultationRes.ok) {
          setConsultations(await consultationRes.json());
        }
        if (conversationRes.ok) {
          setConversations(await conversationRes.json());
        }
        if (notificationRes.ok) {
          setNotifications(await notificationRes.json());
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoadingData(false);
      }
    };

    void loadDashboard();
  }, [authFetch, loading, router, user]);

  const unreadNotifications = useMemo(
    () => notifications.filter((item) => !item.is_read).length,
    [notifications],
  );

  if (loading || !user) {
    return (
      <div className="flex-1 flex justify-center items-center">
        <Loader2 className="animate-spin text-emerald-500 w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-50 p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-black text-slate-800 mb-2">Welcome back, {user.full_name}</h1>
        <p className="text-slate-500 font-medium mb-8">Manage your legal activity from one place.</p>

        {user.role === "lawyer" && (
          <div className="bg-amber-50 border border-amber-200 p-6 rounded-3xl flex flex-col md:flex-row items-center gap-6 mb-8">
            <div className="bg-amber-100 p-4 rounded-2xl shrink-0">
              <ShieldAlert className="w-8 h-8 text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Complete your KYC to get matched</h3>
              <p className="text-slate-600 font-medium mt-1 text-sm leading-relaxed max-w-xl">
                Your profile must be admin-verified before receiving consultations.
              </p>
            </div>
            <Link href="/kyc" className="md:ml-auto w-full md:w-auto px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition-all shadow-sm text-center">
              Submit KYC
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h4 className="text-sm font-bold text-slate-400 uppercase">Consultations</h4>
            <p className="text-4xl font-black text-slate-800 mt-2">{isLoadingData ? "..." : consultations.length}</p>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h4 className="text-sm font-bold text-slate-400 uppercase">Conversations</h4>
            <p className="text-4xl font-black text-slate-800 mt-2">{isLoadingData ? "..." : conversations.length}</p>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h4 className="text-sm font-bold text-slate-400 uppercase">Unread Notifications</h4>
            <p className="text-4xl font-black text-slate-800 mt-2">{isLoadingData ? "..." : unreadNotifications}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <Link href="/consultations" className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:border-emerald-200 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <BriefcaseBusiness className="text-emerald-600" />
              <h3 className="text-lg font-bold text-slate-800">Consultation Workspace</h3>
            </div>
            <p className="text-slate-600 text-sm">Upload, list, and download consultation documents securely.</p>
          </Link>

          <Link href="/notifications" className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:border-emerald-200 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <Bell className="text-emerald-600" />
              <h3 className="text-lg font-bold text-slate-800">Notification Center</h3>
            </div>
            <p className="text-slate-600 text-sm">Track message, payment, and workflow updates in real time.</p>
          </Link>

          {user.role === "lawyer" && (
            <Link href="/lawyer/seal" className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:border-emerald-200 transition-colors md:col-span-2">
              <div className="flex items-center gap-3 mb-2">
                <Stamp className="text-emerald-600" />
                <h3 className="text-lg font-bold text-slate-800">Annual Stamp &amp; Seal</h3>
              </div>
              <p className="text-slate-600 text-sm">Upload your current year NBA stamp/seal with BPF and CPD details. The file stays private and encrypted; clients only see your trust icon.</p>
            </Link>
          )}
        </div>

        <div className="mt-8 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <MessageSquare className="text-emerald-600" />
            <h3 className="text-lg font-bold text-slate-800">Recent Notifications</h3>
          </div>
          {notifications.length === 0 ? (
            <p className="text-slate-500 text-sm">No notifications yet.</p>
          ) : (
            <ul className="space-y-3">
              {notifications.slice(0, 5).map((item) => (
                <li key={item.notification_id} className="border border-slate-100 rounded-xl p-3">
                  <p className="font-semibold text-slate-800 text-sm">{item.title}</p>
                  <p className="text-slate-500 text-sm mt-1">{item.body}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
