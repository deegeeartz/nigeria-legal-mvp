"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  Calendar,
  ShieldCheck,
  CreditCard,
  MessageSquare,
  Sparkles,
  Check
} from "lucide-react";

export default function NotificationsPage() {
  const { user, loading, authFetch } = useAuth();
  const router = useRouter();

  const [notifications, setNotifications] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [markingId, setMarkingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login?redirect=/notifications");
      return;
    }

    if (loading || !user) {
      return;
    }

    const loadNotifications = async () => {
      setFetching(true);
      setErrorMessage("");
      try {
        const response = await authFetch("/api/notifications");
        if (response.ok) {
          const data = await response.json();
          setNotifications(Array.isArray(data) ? data : []);
        } else {
          setErrorMessage("Could not load notifications right now.");
        }
      } catch (error) {
        console.error(error);
        setErrorMessage("Could not load notifications right now.");
      } finally {
        setFetching(false);
      }
    };

    void loadNotifications();
  }, [authFetch, loading, router, user]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.is_read).length,
    [notifications]
  );

  const markAsRead = async (notificationId) => {
    setMarkingId(notificationId);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const response = await authFetch(`/api/notifications/${notificationId}/read`, {
        method: "POST",
      });
      if (response.ok) {
        setNotifications((previous) =>
          previous.map((item) =>
            item.notification_id === notificationId || item.id === notificationId
              ? { ...item, is_read: true }
              : item
          )
        );
        setSuccessMessage("Notification marked as read.");
      } else {
        setErrorMessage("Unable to mark notification as read.");
      }
    } catch (error) {
      console.error(error);
      setErrorMessage("Unable to mark notification as read.");
    } finally {
      setMarkingId(null);
    }
  };

  const markAllAsRead = async () => {
    for (const item of notifications.filter((n) => !n.is_read)) {
      await markAsRead(item.notification_id || item.id);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex-1 flex justify-center items-center py-24">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-stone-500">Loading notifications...</p>
        </div>
      </div>
    );
  }

  const getIcon = (title = "") => {
    const t = title.toLowerCase();
    if (t.includes("consultation") || t.includes("session")) return <Calendar className="w-5 h-5 text-amber-600" />;
    if (t.includes("kyc") || t.includes("verified")) return <ShieldCheck className="w-5 h-5 text-emerald-600" />;
    if (t.includes("payment") || t.includes("escrow")) return <CreditCard className="w-5 h-5 text-indigo-600" />;
    return <MessageSquare className="w-5 h-5 text-stone-600" />;
  };

  return (
    <div className="flex-1 bg-stone-100/70 py-10 px-4 md:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-500 hover:text-stone-900 transition-colors"
          >
            <ArrowLeft size={14} /> Back to Dashboard
          </Link>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs font-bold text-amber-800 hover:underline flex items-center gap-1"
            >
              <Check size={14} /> Mark all as read
            </button>
          )}
        </div>

        {/* Header Banner */}
        <div className="bg-stone-900 text-stone-100 rounded-3xl p-6 md:p-8 border border-stone-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Activity Feed
              </span>
              <span className="text-xs text-stone-400">• Wigally Alerts</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black font-serif text-white tracking-tight flex items-center gap-3">
              <Bell className="w-7 h-7 text-amber-400" />
              Notifications
            </h1>
            <p className="text-xs md:text-sm text-stone-400 max-w-xl font-medium">
              Real-time updates regarding consultations, client messages, case milestones, and escrow releases.
            </p>
          </div>

          <div className="bg-stone-800/80 border border-stone-700/80 px-4 py-2.5 rounded-2xl flex items-center gap-3 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-stone-200">
              {unreadCount} Unread Alert{unreadCount === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        {errorMessage && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 font-medium">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 font-medium">
            {successMessage}
          </div>
        )}

        {fetching ? (
          <div className="bg-white p-16 rounded-3xl border border-stone-200 text-center shadow-xs">
            <Loader2 className="animate-spin text-amber-600 w-10 h-10 mx-auto mb-3" />
            <p className="text-xs font-semibold text-stone-500">Checking for updates...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white p-16 rounded-3xl border border-stone-200 text-center shadow-xs space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
              <Bell size={28} />
            </div>
            <h3 className="text-base font-bold text-stone-800 font-serif">All Caught Up!</h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto font-medium">
              You don&apos;t have any pending alerts right now. When lawyers respond or escrow milestones are updated, you will see them here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((item) => {
              const id = item.notification_id || item.id;
              return (
                <div
                  key={id}
                  className={`bg-white border rounded-2xl p-5 transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    item.is_read
                      ? "border-stone-200 bg-stone-50/40 opacity-80"
                      : "border-amber-400/60 bg-amber-50/20"
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center shrink-0 mt-0.5">
                      {getIcon(item.title)}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-stone-900 font-serif">
                          {item.title}
                        </h3>
                        {!item.is_read && (
                          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-stone-600 font-medium leading-relaxed">
                        {item.body}
                      </p>
                      <span className="text-[10px] text-stone-400 font-mono font-medium block">
                        {item.created_on ? new Date(item.created_on).toLocaleString() : "Recent"}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2 sm:self-center">
                    {!item.is_read ? (
                      <button
                        onClick={() => markAsRead(id)}
                        disabled={markingId === id}
                        className="px-3.5 py-1.5 text-xs rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold disabled:opacity-50 transition-colors shadow-2xs"
                      >
                        {markingId === id ? "Marking..." : "Mark as Read"}
                      </button>
                    ) : (
                      <span className="text-xs font-semibold text-stone-400 flex items-center gap-1">
                        <CheckCircle2 size={15} className="text-emerald-600" /> Read
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
