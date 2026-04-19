"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";

const ACTION_COLORS = {
  "consultation.booked": "bg-blue-100 text-blue-700",
  "consultation.status_updated": "bg-indigo-100 text-indigo-700",
  "document.uploaded": "bg-emerald-100 text-emerald-700",
  "document.downloaded": "bg-teal-100 text-teal-700",
  "kyc.submitted": "bg-amber-100 text-amber-700",
  "kyc.verified": "bg-green-100 text-green-700",
  "kyc.rejected": "bg-rose-100 text-rose-700",
  "payment.created": "bg-purple-100 text-purple-700",
  "payment.released": "bg-violet-100 text-violet-700",
};

export default function AuditLogPage() {
  const { user, loading, authFetch } = useAuth();
  const router = useRouter();

  const [events, setEvents] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [limit, setLimit] = useState(50);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }
    if (!loading && user && user.role !== "admin") {
      router.push("/dashboard");
      return;
    }
    if (loading || !user) return;

    const load = async () => {
      setFetching(true);
      setErrorMessage("");
      try {
        const response = await authFetch(`/api/audit-events?limit=${limit}`);
        if (response.ok) {
          setEvents(await response.json());
        } else {
          setErrorMessage("Unable to load audit events.");
        }
      } catch (err) {
        console.error(err);
        setErrorMessage("Unable to load audit events.");
      } finally {
        setFetching(false);
      }
    };

    void load();
  }, [authFetch, limit, loading, router, user]);

  if (loading || !user) {
    return (
      <div className="flex-1 flex justify-center items-center">
        <Loader2 className="animate-spin text-emerald-500 w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-50 p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
              <ShieldAlert className="w-8 h-8 text-emerald-600" />
              Audit Log
            </h1>
            <p className="text-slate-500 font-medium mt-1">All system events in reverse chronological order.</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600 font-medium">Show last</label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium"
            >
              {[25, 50, 100, 200].map((n) => (
                <option key={n} value={n}>{n} events</option>
              ))}
            </select>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        )}

        {fetching ? (
          <div className="bg-white p-16 rounded-3xl border border-slate-100 text-center">
            <Loader2 className="animate-spin text-emerald-500 w-10 h-10 mx-auto" />
          </div>
        ) : events.length === 0 ? (
          <div className="bg-white p-16 rounded-3xl border border-slate-100 text-center">
            <ShieldAlert className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No audit events recorded yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 font-semibold text-slate-500 w-12">#</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-500">Action</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-500">Detail</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-500">Resource</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-500">Actor</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-500">Time</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event, idx) => (
                  <tr key={event.audit_event_id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="px-5 py-3 text-slate-400 font-mono text-xs">{event.audit_event_id}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${ACTION_COLORS[event.action] || "bg-slate-100 text-slate-600"}`}>
                        {event.action}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-700 max-w-xs truncate">{event.detail}</td>
                    <td className="px-5 py-3 text-slate-500 font-mono text-xs">
                      {event.resource_type}
                      {event.resource_id ? `/${event.resource_id}` : ""}
                    </td>
                    <td className="px-5 py-3 text-slate-500 font-mono text-xs">
                      {event.actor_user_id ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-slate-400 text-xs whitespace-nowrap">
                      {new Date(event.created_on).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
