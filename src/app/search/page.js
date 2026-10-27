"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Search,
  Loader2,
  ShieldCheck,
  MapPin,
  Briefcase,
  Star,
  Clock,
  Filter,
  Scale,
  Award,
  CheckCircle,
  X,
  SlidersHorizontal,
  ChevronDown
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiUrl } from "@/lib/api";

const PRACTICE_AREAS = [
  { id: "all", label: "All Practice Areas" },
  { id: "employment", label: "Employment & Labour" },
  { id: "property", label: "Property & Real Estate" },
  { id: "contracts", label: "Commercial & Contracts" },
  { id: "litigation", label: "Litigation & Dispute" },
  { id: "family", label: "Family & Probate" },
  { id: "corporate", label: "Corporate & Tax" },
  { id: "energy", label: "Energy & Maritime" },
];

const NIGERIAN_STATES = [
  { id: "all", label: "All Nigerian Jurisdictions" },
  { id: "Lagos", label: "Lagos State" },
  { id: "Abuja", label: "Abuja (FCT)" },
  { id: "Rivers", label: "Rivers (Port Harcourt)" },
  { id: "Oyo", label: "Oyo (Ibadan)" },
  { id: "Kano", label: "Kano State" },
  { id: "Enugu", label: "Enugu State" },
  { id: "Edo", label: "Edo (Benin)" },
];

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || searchParams.get("area") || "";
  const initialArea = searchParams.get("area") || "all";
  const initialState = searchParams.get("state") || "all";

  // Core state declarations
  const [query, setQuery] = useState(initialQuery);
  const [selectedArea, setSelectedArea] = useState(initialArea);
  const [selectedState, setSelectedState] = useState(initialState);
  const [sanOnly, setSanOnly] = useState(false);
  const [sortBy, setSortBy] = useState("recommended"); // recommended, rating, fee_asc, matters
  const [urgency, setUrgency] = useState("this_week");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
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

  const fetchMatches = async (searchQuery = query, area = selectedArea, state = selectedState, san = sanOnly) => {
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(apiUrl("/api/intake/match"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: searchQuery,
          state: state,
          practice_area: area,
          is_san: san,
          urgency,
          budget_max_ngn: 150000,
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
    fetchMatches(query, selectedArea, selectedState, sanOnly);
  }, [selectedArea, selectedState, sanOnly]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchMatches(query, selectedArea, selectedState, sanOnly);
  };

  const handleResetFilters = () => {
    setQuery("");
    setSelectedArea("all");
    setSelectedState("all");
    setSanOnly(false);
    setSortBy("recommended");
    fetchMatches("", "all", "all", false);
  };

  // Client-side sorting
  const sortedResults = useMemo(() => {
    const list = [...results];
    if (sortBy === "rating") {
      list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === "matters") {
      list.sort((a, b) => (b.completed_matters || 0) - (a.completed_matters || 0));
    } else if (sortBy === "fee_asc") {
      list.sort((a, b) => (a.base_consult_fee_ngn || a.price_ngn || 0) - (b.base_consult_fee_ngn || b.price_ngn || 0));
    } else {
      // Default: recommended score
      list.sort((a, b) => (b.score || 0) - (a.score || 0));
    }
    return list;
  }, [results, sortBy]);

  return (
    <div className="flex flex-col flex-1 warm-parchment-pattern min-h-screen">
      {/* Header Banner */}
      <div className="bg-stone-900 pb-20 pt-10 px-6 border-b border-stone-800 text-white">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2 font-mono">
            <Scale size={16} />
            Wigally Verified Directory
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-2 tracking-tight font-serif">
            Find Your Verified Legal Counsel
          </h1>
          <p className="text-stone-300 mb-8 text-sm sm:text-base font-normal max-w-3xl">
            Connect directly with verified NBA-enrolled practitioners across Nigeria. Review court admissions, past matters, and schedule confidential consultations protected by banking escrow.
          </p>

          {/* Search Bar Form */}
          <form
            onSubmit={handleSearchSubmit}
            className="bg-white p-3 sm:p-4 rounded-3xl shadow-2xl flex flex-col md:flex-row gap-3 items-stretch md:items-end border border-stone-200"
          >
            {/* Search Input */}
            <div className="flex-1">
              <label className="text-[11px] font-bold text-stone-500 uppercase ml-1 mb-1 block">
                Issue, Practice Area or Lawyer Name
              </label>
              <div className="relative">
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. Commercial lease review, Employment dispute, Amaka Okonkwo..."
                  className="w-full bg-stone-50 pl-10 pr-4 py-3 rounded-2xl border border-stone-200 text-stone-900 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all placeholder:text-stone-400"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      fetchMatches("", selectedArea, selectedState, sanOnly);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            </div>

            {/* State Filter */}
            <div className="w-full md:w-52 shrink-0">
              <label className="text-[11px] font-bold text-stone-500 uppercase ml-1 mb-1 block">
                State / Jurisdiction
              </label>
              <div className="relative">
                <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="w-full bg-stone-50 pl-9 pr-8 py-3 rounded-2xl border border-stone-200 text-stone-900 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 appearance-none transition-all cursor-pointer"
                >
                  {NIGERIAN_STATES.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full md:w-auto px-7 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-2xl transition-all shrink-0 flex items-center justify-center gap-2 text-sm shadow-md shadow-amber-600/30 cursor-pointer disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
              <span>Find Counsel</span>
            </button>
          </form>

          {/* Quick Practice Area Pills */}
          <div className="mt-5 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <span className="text-[11px] font-mono uppercase text-stone-400 font-bold shrink-0 mr-1 flex items-center gap-1">
              <Filter size={13} /> Areas:
            </span>
            {PRACTICE_AREAS.map((pa) => {
              const isActive = selectedArea === pa.id;
              return (
                <button
                  key={pa.id}
                  type="button"
                  onClick={() => setSelectedArea(pa.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? "bg-amber-500 text-stone-950 font-bold shadow-xs"
                      : "bg-stone-800 text-stone-300 hover:bg-stone-700 hover:text-white border border-stone-700"
                  }`}
                >
                  {pa.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Results Container */}
      <div className="max-w-5xl mx-auto w-full px-6 -mt-10 mb-20 z-10 relative">
        {/* Secondary Filter & Control Bar */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-stone-200 mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-black text-stone-900 font-serif flex items-center gap-1.5">
              <Award size={16} className="text-amber-600" />
              {sortedResults.length} Verified Counsel Available
            </span>

            {/* SAN Only Filter Pill */}
            <button
              type="button"
              onClick={() => setSanOnly(!sanOnly)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                sanOnly
                  ? "bg-amber-100 text-amber-900 border-amber-300"
                  : "bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100"
              }`}
            >
              <Award size={13} className={sanOnly ? "text-amber-700" : "text-stone-400"} />
              Senior Advocates (SAN) Only
            </button>

            {(selectedArea !== "all" || selectedState !== "all" || sanOnly || query) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-bold text-rose-700 hover:text-rose-900 flex items-center gap-1 cursor-pointer"
              >
                <X size={13} /> Clear Filters
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-stone-400 uppercase font-mono">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-stone-50 border border-stone-200 text-stone-800 text-xs font-semibold rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
            >
              <option value="recommended">Highest Recommended</option>
              <option value="rating">Highest Rated</option>
              <option value="matters">Most Matters Completed</option>
              <option value="fee_asc">Consultation Fee (Lowest)</option>
            </select>
          </div>
        </div>

        {/* Offline cached notification */}
        {isOfflineCached && (
          <div className="mb-4 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-2.5 text-xs font-medium shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
            <span><strong>Offline Mode:</strong> Displaying previously viewed verified legal practitioners.</span>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-3xl p-16 text-center shadow-sm border border-stone-200">
            <Loader2 className="w-10 h-10 animate-spin text-amber-600 mx-auto mb-3" />
            <p className="text-stone-900 font-bold text-base font-serif">Searching verified legal counsel...</p>
            <p className="text-stone-500 text-xs mt-1">Cross-referencing court admissions and matter history</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && sortedResults.length === 0 && (
          <div className="bg-white rounded-3xl p-16 text-center shadow-sm border border-stone-200">
            <div className="w-16 h-16 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto mb-4">
              <Briefcase size={28} />
            </div>
            <h3 className="text-lg font-black text-stone-900 font-serif mb-1">
              No legal practitioners found
            </h3>
            <p className="text-stone-500 text-xs max-w-md mx-auto mb-5">
              We couldn&apos;t find any practitioners matching &ldquo;{query || selectedArea}&rdquo; in {selectedState === "all" ? "Nigeria" : selectedState}.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-5 py-2.5 bg-stone-900 text-white rounded-xl text-xs font-bold hover:bg-stone-800 transition-colors shadow-xs"
            >
              Reset All Filters
            </button>
          </div>
        )}

        {/* Lawyer Cards List */}
        {!loading && sortedResults.length > 0 && (
          <div className="space-y-4">
            {sortedResults.map((lw, idx) => {
              const feeFormatted = new Intl.NumberFormat("en-NG", {
                style: "currency",
                currency: "NGN",
                maximumFractionDigits: 0,
              }).format(lw.base_consult_fee_ngn || lw.price_ngn || 45000);

              return (
                <motion.div
                  key={lw.lawyer_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200 hover:border-amber-400 hover:shadow-md transition-all flex flex-col md:flex-row gap-5"
                >
                  {/* Avatar / Photo */}
                  <div className="relative shrink-0 flex items-center justify-center md:items-start">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden bg-stone-900 border-2 border-stone-800 shadow-sm flex items-center justify-center">
                      {lw.avatar_url ? (
                        <img
                          src={lw.avatar_url}
                          alt={lw.full_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-amber-400 font-black text-2xl font-serif">
                          {lw.full_name?.charAt(0) || "L"}
                        </span>
                      )}
                    </div>
                    {lw.nba_verified && (
                      <span
                        title="NBA Verified Practitioner"
                        className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow border border-white"
                      >
                        <ShieldCheck size={14} />
                      </span>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-2">
                      <div>
                        <h3 className="text-lg font-black text-stone-900 flex items-center gap-2 flex-wrap font-serif">
                          <span>{lw.full_name}</span>
                          {lw.is_san && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 font-mono">
                              <Award size={11} /> SAN
                            </span>
                          )}
                          {lw.badges?.includes("NBA Verified") && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <ShieldCheck size={11} className="text-emerald-600" />
                              NBA Verified
                            </span>
                          )}
                        </h3>
                        <p className="text-xs font-semibold text-stone-500 mt-0.5 flex items-center gap-2 flex-wrap">
                          <span className="text-stone-700 font-bold">{lw.tier?.replaceAll("_", " ")}</span>
                          <span>•</span>
                          <span>{lw.years_called || 5} Years at Bar</span>
                          <span>•</span>
                          <span className="text-amber-800 font-bold">{lw.completed_matters || 0} Matters Closed</span>
                        </p>
                      </div>

                      {/* Engagement & Pricing */}
                      <div className="text-left sm:text-right shrink-0">
                        <span className="text-base font-black text-stone-900 font-serif block">
                          {feeFormatted}
                        </span>
                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider font-mono">
                          Protected in Escrow
                        </span>
                      </div>
                    </div>

                    {/* Practice Area Chips */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {lw.practice_areas?.map((pa, paIdx) => (
                        <button
                          key={paIdx}
                          type="button"
                          onClick={() => setSelectedArea(pa.toLowerCase())}
                          className="px-2.5 py-0.5 bg-stone-100 hover:bg-amber-100 hover:text-amber-900 border border-stone-200 rounded-md text-[11px] font-semibold text-stone-700 capitalize transition-colors cursor-pointer"
                        >
                          {pa.replaceAll("_", " ")}
                        </button>
                      ))}
                    </div>

                    {/* Court Admissions / Badges */}
                    {lw.court_admissions && lw.court_admissions.length > 0 && (
                      <div className="flex items-center gap-1.5 text-[10px] text-stone-500 mb-3 overflow-x-auto">
                        <span className="font-mono uppercase font-bold text-stone-400">Admissions:</span>
                        {lw.court_admissions.map((ca, caIdx) => (
                          <span key={caIdx} className="px-2 py-0.5 bg-stone-50 rounded text-stone-600 border border-stone-200 capitalize font-medium">
                            {ca.replaceAll("_", " ")}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Footer Row */}
                    <div className="flex items-center justify-between text-xs font-medium border-t border-stone-100 pt-3 text-stone-500">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1 text-stone-700 font-semibold">
                          <MapPin size={14} className="text-stone-400" /> {lw.state}
                        </span>
                        <span className="flex items-center gap-1 text-amber-700 font-bold">
                          <Star size={14} className="text-amber-500 fill-amber-500" /> {lw.rating || 4.8}
                        </span>
                        {lw.avg_response_hours && (
                          <span className="hidden sm:flex items-center gap-1 text-stone-500">
                            <Clock size={13} className="text-stone-400" /> &lt; {lw.avg_response_hours}h response
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          href={`/book/${lw.lawyer_id}`}
                          className="px-4 py-2 bg-stone-900 text-white rounded-xl font-bold hover:bg-amber-600 transition-all text-xs shrink-0 shadow-sm cursor-pointer"
                        >
                          Book Consult
                        </Link>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
