"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCircle2, Loader2 } from "lucide-react";

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
      router.push("/login");
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
          setNotifications(await response.json());
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
    [notifications],
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
        const updated = await response.json();
        setNotifications((previous) =>
          previous.map((item) => (item.notification_id === updated.notification_id ? updated : item)),
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

  if (loading || !user) {
    return (
      <div className="flex-1 flex justify-center items-center">
        <Loader2 className="animate-spin text-emerald-500 w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-50 p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-800">Notifications</h1>
            <p className="text-slate-500 font-medium mt-1">Stay updated on your legal workflow activity.</p>
          </div>
          <div className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full font-bold text-sm">
            {unreadCount} unread
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </div>
        )}

        {fetching ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center">
            <Loader2 className="animate-spin text-emerald-500 w-10 h-10 mx-auto" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center">
            <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No notifications yet.</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {notifications.map((item) => (
              <li
                key={item.notification_id}
                className={`bg-white border rounded-2xl p-5 ${item.is_read ? "border-slate-100" : "border-emerald-200"}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-wide text-slate-400 font-semibold">{item.kind}</p>
                    <h3 className="font-bold text-slate-800 mt-1">{item.title}</h3>
                    <p className="text-slate-600 mt-2 text-sm">{item.body}</p>
                  </div>
                  {!item.is_read && (
                    <button
                      onClick={() => markAsRead(item.notification_id)}
                      disabled={markingId === item.notification_id}
                      className="px-3 py-2 text-xs rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-500 disabled:opacity-70"
                    >
                      {markingId === item.notification_id ? "Marking..." : "Mark Read"}
                    </button>
                  )}
                  {item.is_read && <CheckCircle2 className="text-emerald-600 w-5 h-5 mt-1" />}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
