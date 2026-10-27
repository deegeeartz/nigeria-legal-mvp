"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, Loader2, ShieldCheck, MapPin, Briefcase, Star, Clock, User, Filter, Scale } from "lucide-react";
import { motion } from "framer-motion";
import { apiUrl } from "@/lib/api";

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || searchParams.get("area") || "";

  const [query, setQuery] = useState(initialQuery);
  const [urgency, setUrgency] = useState("this_week");
  const [loading, setLoading] = useState(false);
  const [isOfflineCached, setIsOfflineCached] = useState(false);

  // Initialize from offline cache if available
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("wigally_cached_lawyers");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setResults(parsed);
            setSearched(true);
          }
        }
      } catch (e) {
        console.warn("Failed reading cached lawyers:", e);
      }
    }
  }, []);

  const fetchMatches = async (searchQuery) => {
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(apiUrl("/api/intake/match"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: searchQuery || "legal counsel",
          state: "Lagos",
          urgency,
          budget_max_ngn: 100000,
          legal_terms_mode: false,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const matches = data.matches || [];
        setResults(matches);
        setIsOfflineCached(false);
        if (typeof window !== "undefined" && matches.length > 0) {
          try {
            localStorage.setItem("wigally_cached_lawyers", JSON.stringify(matches));
          } catch (e) {}
        }
      } else {
        throw new Error("Match fetch failed");
      }
    } catch (err) {
      console.warn("Match offline fallback:", err);
      if (typeof window !== "undefined") {
        try {
          const cached = localStorage.getItem("wigally_cached_lawyers");
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setResults(parsed);
              setIsOfflineCached(true);
            }
          }
        } catch (e) {}
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      fetchMatches(initialQuery);
    } else {
      fetchMatches("");
    }
  }, [initialQuery]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchMatches(query);
  };

  return (
    <div className="flex flex-col flex-1 warm-parchment-pattern min-h-screen">
      {/* Header Banner */}
      <div className="bg-stone-900 pb-20 pt-10 px-6 border-b border-stone-800 text-white">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2 font-mono">
            <Scale size={16} />
            Wigally Verified Directory
          </div>
          <h1 className="text-3xl font-black text-white mb-2 tracking-tight">Find Your Legal Counsel</h1>
          <p className="text-slate-300 mb-8 text-sm sm:text-base font-normal">
            Describe your legal matter to connect with verified NBA-enrolled lawyers, view active court admissions, and initiate confidential intake.
          </p>

          <form onSubmit={handleSearch} className="bg-white p-3 sm:p-4 rounded-2xl shadow-xl flex flex-col md:flex-row gap-3 items-end border border-slate-200">
            <div className="w-full">
              <label className="text-[11px] font-bold text-slate-500 uppercase ml-1 mb-1 block">Your Legal Issue or Keyword</label>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. Commercial lease review in Lagos, Employment dispute..."
                className="w-full bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-slate-900 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="w-full md:w-56 shrink-0">
              <label className="text-[11px] font-bold text-slate-500 uppercase ml-1 mb-1 block">Urgency Level</label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
                className="w-full bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-slate-900 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none"
              >
                <option value="researching">Just Researching</option>
                <option value="this_week">Need help this week</option>
                <option value="urgent">Urgent Matter</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full md:w-auto px-7 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shrink-0 flex items-center justify-center gap-2 text-sm shadow-md shadow-emerald-600/20"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
              Find Lawyers
            </button>
          </form>
        </div>
      </div>

      {/* Results Container */}
      <div className="max-w-4xl mx-auto w-full px-6 -mt-10 mb-20 z-10 relative">
        {isOfflineCached && (
          <div className="mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-2.5 text-xs font-medium shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
            <span><strong>Offline Mode:</strong> Showing your previously viewed verified legal practitioners.</span>
          </div>
        )}
        {loading && (
          <div className="bg-white rounded-2xl p-12 text-center shadow-md border border-slate-200">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mx-auto mb-3" />
            <p className="text-slate-700 font-bold text-sm">Searching verified practitioners on Wigally...</p>
          </div>
        )}

        {!loading && results.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-200">
            <Briefcase className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-600 font-semibold text-sm">No legal practitioners found matching that query.</p>
            <p className="text-slate-400 text-xs mt-1">Try searching broader keywords such as &quot;Lagos&quot;, &quot;Property&quot;, or &quot;Contracts&quot;.</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Filter size={18} className="text-emerald-600" />
                Verified Legal Practitioners
              </h2>
              <span className="bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs px-3 py-1 rounded-full">
                {results.length} Available
              </span>
            </div>

            {results.map((lw, idx) => (
              <motion.div
                key={lw.lawyer_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all flex flex-col md:flex-row gap-5"
              >
                <div className="w-16 h-16 rounded-2xl bg-slate-900 text-amber-400 font-black flex items-center justify-center text-xl shrink-0 shadow-sm border border-slate-800">
                  {lw.full_name?.charAt(0) || "L"}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 flex-wrap">
                        {lw.full_name}
                        {lw.badges?.includes("NBA Verified") && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <ShieldCheck size={12} className="text-emerald-600" />
                            NBA Verified
                          </span>
                        )}
                        {lw.is_san && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                            SAN
                          </span>
                        )}
                      </h3>
                      <p className="text-xs font-semibold text-slate-500 mt-0.5">
                        {lw.tier?.replaceAll("_", " ")} • {lw.completed_matters || 0} Matters Completed
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Engagement</p>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 mt-1">
                        <ShieldCheck size={12} className="text-emerald-600" />
                        Confidential Escrow
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {lw.practice_areas?.map((pa, paIdx) => (
                      <span key={paIdx} className="px-2.5 py-0.5 bg-slate-100 border border-slate-200 rounded-md text-[11px] font-semibold text-slate-700 capitalize">
                        {pa}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs font-medium border-t border-slate-100 pt-3 text-slate-500">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1 text-slate-600 font-semibold"><MapPin size={14} className="text-slate-400" /> {lw.state}</span>
                      <span className="flex items-center gap-1 text-amber-700 font-semibold"><Star size={14} className="text-amber-500 fill-amber-500" /> {lw.rating || 4.8}</span>
                    </div>
                    <Link
                      href={`/book/${lw.lawyer_id}`}
                      className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors text-xs shrink-0 shadow-sm"
                    >
                      Book Consult
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
