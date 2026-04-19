"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Loader2, ShieldCheck, MapPin, Briefcase, Star, Clock, User } from "lucide-react";
import { motion } from "framer-motion";
import { apiUrl } from "@/lib/api";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [urgency, setUrgency] = useState("this_week");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query) return;
    
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(apiUrl("/api/intake/match"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: query,
          state: "Lagos",
          urgency,
          budget_max_ngn: 50000,
          legal_terms_mode: false,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setResults(data.matches || []);
      } else {
        console.error("Match failed");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 bg-slate-50">
      <div className="bg-emerald-600 pb-24 pt-8 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-black text-white mb-2">Find Your Legal Counsel</h1>
          <p className="text-emerald-100 mb-8 font-medium">Describe your legal issue, and we will match you with the best verified lawyer.</p>
          
          <form onSubmit={handleSearch} className="bg-white p-4 rounded-3xl shadow-2xl flex flex-col md:flex-row gap-4 items-end">
             <div className="w-full">
               <label className="text-xs font-bold text-slate-500 uppercase ml-2 mb-1 block">Your Legal Issue</label>
               <input
                 type="text"
                 value={query}
                 onChange={(e) => setQuery(e.target.value)}
                 placeholder="e.g. I need help reviewing a commercial property lease"
                 className="w-full bg-slate-50 p-4 rounded-2xl border-none focus:ring-0 focus:bg-slate-100 text-slate-900 font-medium"
               />
             </div>
             
             <div className="w-full md:w-64 shrink-0">
               <label className="text-xs font-bold text-slate-500 uppercase ml-2 mb-1 block">Urgency</label>
               <select
                 value={urgency}
                 onChange={(e) => setUrgency(e.target.value)}
                 className="w-full bg-slate-50 p-4 rounded-2xl border-none focus:ring-0 focus:bg-slate-100 text-slate-900 font-medium appearance-none"
               >
                 <option value="researching">Just Researching</option>
                 <option value="this_week">Need help this week</option>
                 <option value="urgent">Urgent</option>
               </select>
             </div>

             <button type="submit" disabled={loading || !query} className="w-full md:w-auto px-8 py-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold rounded-2xl transition-all shrink-0 flex items-center justify-center gap-2">
               {loading ? <Loader2 className="animate-spin" /> : <Search size={20} />}
               Search
             </button>
          </form>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full px-6 -mt-12 mb-20 z-10 relative">
        {!searched && !loading && (
          <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-slate-100">
             <Briefcase className="w-16 h-16 mx-auto text-slate-300 mb-4" />
             <h3 className="text-xl font-bold text-slate-700">Ready to match</h3>
             <p className="text-slate-500 font-medium mt-2">Enter your legal needs above to see verified recommendations based on expertise and location.</p>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 animate-spin text-emerald-500 mb-4" />
            <p className="text-slate-600 font-bold">Finding the best matches...</p>
          </div>
        )}

        {searched && !loading && results.length === 0 && (
          <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-slate-100">
             <p className="text-slate-500 font-medium">No lawyers found matching that exact criterion. Please try adjusting your search.</p>
          </div>
        )}

        {searched && !loading && results.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-800">Top Recommendations</h2>
              <span className="bg-emerald-100 text-emerald-700 font-bold text-sm px-3 py-1 rounded-full">{results.length} found</span>
            </div>
            
            {results.map((lw, idx) => (
              <motion.div 
                key={lw.lawyer_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all flex flex-col md:flex-row gap-6 cursor-pointer group"
              >
                <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0">
                  <User size={32} className="text-slate-400 group-hover:text-emerald-500 transition-colors" />
                </div>
                
                <div className="flex-1 min-w-0">
                   <div className="flex items-start justify-between mb-2">
                     <div>
                       <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                         {lw.full_name}
                         {lw.badges?.includes("NBA Verified") && <ShieldCheck className="text-emerald-500 w-5 h-5" />}
                       </h3>
                       <p className="text-sm font-medium text-slate-500">{lw.tier?.replaceAll("_", " ")} • Score {lw.score}</p>
                     </div>
                     <div className="text-right">
                       <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Consultation</p>
                       <p className="text-lg font-black text-slate-900">₦{lw.price_ngn.toLocaleString()}</p>
                     </div>
                   </div>
                   
                   <div className="flex flex-wrap gap-2 mb-4">
                     {lw.why_recommended?.map((reason) => (
                       <span key={reason.label} className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-full text-xs font-semibold text-slate-600 capitalize">
                         {reason.label}: {reason.value}
                       </span>
                     ))}
                   </div>
                   
                   <div className="flex items-center justify-between text-sm font-medium border-t border-slate-100 pt-4 text-slate-500">
                     <div className="flex items-center gap-4">
                       <span className="flex items-center gap-1"><MapPin size={16} /> {lw.state}</span>
                       <span className="flex items-center gap-1"><Clock size={16} /> {lw.tier?.replaceAll("_", " ")}</span>
                       <span className="flex items-center gap-1"><Star size={16} className="text-yellow-400 fill-yellow-400" /> Score {lw.score}</span>
                     </div>
                     <Link href={`/book/${lw.lawyer_id}`} className="px-5 py-2 bg-slate-900 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors text-sm shadow-sm hidden md:block group-hover:block shrink-0">
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
