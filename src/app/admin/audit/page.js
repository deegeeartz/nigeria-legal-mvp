"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Loader2,
  ShieldAlert,
  ArrowLeft,
  Filter,
  Search,
  Clock,
  User,
  Database,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

const ACTION_COLORS = {
  "consultation.booked": "bg-blue-100 text-blue-800 border-blue-200",
  "consultation.status_updated": "bg-indigo-100 text-indigo-800 border-indigo-200",
  "document.uploaded": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "document.downloaded": "bg-teal-100 text-teal-800 border-teal-200",
  "kyc.submitted": "bg-amber-100 text-amber-800 border-amber-200",
  "kyc.verified": "bg-green-100 text-green-800 border-green-200",
  "kyc.rejected": "bg-rose-100 text-rose-800 border-rose-200",
  "payment.created": "bg-purple-100 text-purple-800 border-purple-200",
  "payment.released": "bg-violet-100 text-violet-800 border-violet-200",
};

export default function AuditLogPage() {
  const { user, loading, authFetch } = useAuth();
  const router = useRouter();

  const [events, setEvents] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [limit, setLimit] = useState(50);
  const [searchQuery, setSearchQuery] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login?redirect=/admin/audit");
      return;
    }
    if (loading || !user) return;

    const load = async () => {
      setFetching(true);
      setErrorMessage("");
      try {
        const response = await authFetch(`/api/audit-events?limit=${limit}`);
        if (response.ok) {
          const data = await response.json();
          setEvents(Array.isArray(data) ? data : []);
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

  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return events;
    const q = searchQuery.toLowerCase();
    return events.filter(
      (e) =>
        e.action?.toLowerCase().includes(q) ||
        e.detail?.toLowerCase().includes(q) ||
        e.resource_type?.toLowerCase().includes(q) ||
        String(e.actor_user_id || "").includes(q)
    );
  }, [events, searchQuery]);

  if (loading || !user) {
    return (
      <div className="flex-1 flex justify-center items-center py-24">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-stone-500">Checking administrator privileges...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-stone-100/70 py-10 px-4 md:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-500 hover:text-stone-900 transition-colors"
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>

        {/* Header Banner */}
        <div className="bg-stone-900 text-stone-100 rounded-3xl p-6 md:p-8 border border-stone-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30">
                Security &amp; Compliance
              </span>
              <span className="text-xs text-stone-400">• NDPA Immutable Audit Trail</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black font-serif text-white tracking-tight flex items-center gap-3">
              <ShieldAlert className="w-7 h-7 text-rose-400" />
              Administrative Audit Log
            </h1>
            <p className="text-xs md:text-sm text-stone-400 max-w-xl font-medium">
              Permanent record of security actions, document access, escrow state changes, and KYC reviews.
            </p>
          </div>

          <div className="bg-stone-800/80 border border-stone-700/80 px-4 py-2.5 rounded-2xl flex items-center gap-3 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="text-xs font-bold text-stone-200">
              {filteredEvents.length} Recorded Event{filteredEvents.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        {errorMessage && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 font-medium">
            {errorMessage}
          </div>
        )}

        {/* Controls Bar */}
        <div className="bg-white rounded-3xl border border-stone-200 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by action, detail, or actor..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-stone-200 bg-stone-50 text-xs font-medium focus:outline-hidden focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <label className="text-xs text-stone-500 font-bold uppercase tracking-wider font-mono">
              Limit
            </label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="px-3.5 py-2 rounded-2xl border border-stone-200 bg-stone-50 text-xs font-bold text-stone-700 focus:outline-hidden"
            >
              {[25, 50, 100, 200].map((n) => (
                <option key={n} value={n}>
                  {n} events
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Audit Log Table */}
        {fetching ? (
          <div className="bg-white p-16 rounded-3xl border border-stone-200 text-center shadow-xs">
            <Loader2 className="animate-spin text-amber-600 w-10 h-10 mx-auto mb-3" />
            <p className="text-xs font-semibold text-stone-500">Retrieving audit ledger...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="bg-white p-16 rounded-3xl border border-stone-200 text-center shadow-xs space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
              <ShieldAlert size={28} />
            </div>
            <h3 className="text-base font-bold text-stone-800 font-serif">No Events Found</h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto font-medium">
              No audit records match your current search filters.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50/80 text-stone-500 font-mono uppercase tracking-wider text-[10px]">
                    <th className="px-5 py-3.5 font-bold w-12">#</th>
                    <th className="px-5 py-3.5 font-bold">Action Event</th>
                    <th className="px-5 py-3.5 font-bold">Event Detail</th>
                    <th className="px-5 py-3.5 font-bold">Resource Type</th>
                    <th className="px-5 py-3.5 font-bold">Actor</th>
                    <th className="px-5 py-3.5 font-bold">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium">
                  {filteredEvents.map((event, idx) => (
                    <tr
                      key={event.audit_event_id || idx}
                      className={idx % 2 === 0 ? "bg-white hover:bg-stone-50/60" : "bg-stone-50/30 hover:bg-stone-50"}
                    >
                      <td className="px-5 py-3.5 text-stone-400 font-mono text-[11px]">
                        {event.audit_event_id || idx + 1}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border uppercase tracking-wider ${
                            ACTION_COLORS[event.action] || "bg-stone-100 text-stone-700 border-stone-200"
                          }`}
                        >
                          {event.action}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-stone-800 max-w-sm font-medium">
                        {event.detail}
                      </td>
                      <td className="px-5 py-3.5 text-stone-500 font-mono text-[11px]">
                        {event.resource_type}
                        {event.resource_id ? ` • #${event.resource_id}` : ""}
                      </td>
                      <td className="px-5 py-3.5 text-stone-600 font-mono text-[11px]">
                        {event.actor_user_id ? `User #${event.actor_user_id}` : "System Service"}
                      </td>
                      <td className="px-5 py-3.5 text-stone-400 text-[11px] whitespace-nowrap font-mono">
                        {event.created_on ? new Date(event.created_on).toLocaleString() : "Just now"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
