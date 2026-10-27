"use client";

import { useState, useEffect } from "react";
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  CheckCircle2,
  Share2,
  BookOpen
} from "lucide-react";

export function DailyQuickTake({ quickTakes = [] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [learnedTakes, setLearnedTakes] = useState({});
  const [savedTakes, setSavedTakes] = useState({});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const savedLearned = localStorage.getItem("wigally_learned_takes");
      if (savedLearned) setLearnedTakes(JSON.parse(savedLearned));
      const savedBookmarks = localStorage.getItem("wigally_saved_takes");
      if (savedBookmarks) setSavedTakes(JSON.parse(savedBookmarks));
    } catch {
      // Local storage fallback
    }
  }, []);

  if (!quickTakes || quickTakes.length === 0) return null;

  const current = quickTakes[currentIndex] || quickTakes[0];
  const isLearned = Boolean(learnedTakes[current.id]);
  const isSaved = Boolean(savedTakes[current.id]);

  const toggleLearned = (e) => {
    e.stopPropagation();
    const updated = { ...learnedTakes, [current.id]: !isLearned };
    setLearnedTakes(updated);
    try {
      localStorage.setItem("wigally_learned_takes", JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const toggleSaved = (e) => {
    e.stopPropagation();
    const updated = { ...savedTakes, [current.id]: !isSaved };
    setSavedTakes(updated);
    try {
      localStorage.setItem("wigally_saved_takes", JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleShare = async (e) => {
    e.stopPropagation();
    if (navigator?.share) {
      try {
        await navigator.share({
          title: `Wigally Legal Quick Take: ${current.headline}`,
          text: current.hook,
          url: window.location.href
        });
        return;
      } catch {
        // user cancelled or fallback
      }
    }
    navigator.clipboard?.writeText?.(
      `⚖️ ${current.headline} — ${current.hook} (Via Wigally Legal Community)`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrev = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? quickTakes.length - 1 : prev - 1));
  };

  const handleNext = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === quickTakes.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="editorial-card rounded-2xl p-6 sm:p-7 relative overflow-hidden bg-gradient-to-br from-amber-50/70 via-stone-50 to-white border border-stone-200 shadow-sm">
      {/* Editorial Header */}
      <div className="flex items-center justify-between pb-4 border-b border-stone-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
            <Sparkles size={16} className="text-amber-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-900 font-mono">
                Daily Legal Bite
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100/80 font-semibold text-amber-900">
                {current.category}
              </span>
            </div>
            <p className="text-xs text-stone-500">Curated legal insight for everyday life</p>
          </div>
        </div>

        {/* Carousel indicators */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePrev}
            className="w-7 h-7 rounded-full border border-stone-300 hover:bg-stone-100 flex items-center justify-center text-stone-600 transition-colors"
            title="Previous quick take"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs font-mono text-stone-500 px-1">
            {currentIndex + 1}/{quickTakes.length}
          </span>
          <button
            onClick={handleNext}
            className="w-7 h-7 rounded-full border border-stone-300 hover:bg-stone-100 flex items-center justify-center text-stone-600 transition-colors"
            title="Next quick take"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="py-5">
        <h3 className="font-editorial text-2xl font-bold text-stone-900 tracking-tight leading-snug">
          {current.headline}
        </h3>
        <p className="text-sm text-stone-700 mt-2 font-medium leading-relaxed">
          {current.hook}
        </p>

        {/* Legal Truth & Actionable Advice */}
        <div className="mt-4 p-4 rounded-xl bg-white border border-stone-200/90 shadow-xs">
          <div className="text-xs font-bold text-stone-900 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <BookOpen size={14} className="text-emerald-700" />
            The Statutory Position
          </div>
          <p className="text-xs sm:text-sm text-stone-700 leading-relaxed font-sans">
            {current.legal_truth}
          </p>

          <div className="mt-3 pt-3 border-t border-stone-100 flex flex-col gap-1.5">
            <div className="text-xs font-bold text-amber-900">Actionable Advice:</div>
            <p className="text-xs text-stone-600 leading-relaxed bg-amber-50/60 p-2.5 rounded-lg border border-amber-200/50">
              {current.actionable_step}
            </p>
            <div className="text-[11px] text-stone-400 font-mono mt-1">
              Ref: {current.citation}
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-stone-200/80">
        <button
          onClick={toggleLearned}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            isLearned
              ? "bg-emerald-600 text-white shadow-xs"
              : "bg-stone-100 text-stone-700 hover:bg-stone-200"
          }`}
        >
          <CheckCircle2 size={14} />
          {isLearned ? "Marked as Learned" : "Mark as Learned"}
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleSaved}
            className={`p-2 rounded-lg border transition-colors ${
              isSaved
                ? "bg-amber-100 border-amber-300 text-amber-800"
                : "border-stone-200 text-stone-500 hover:bg-stone-100"
            }`}
            title={isSaved ? "Saved in your knowledge box" : "Save for later"}
          >
            <Bookmark size={15} fill={isSaved ? "currentColor" : "none"} />
          </button>
          <button
            onClick={handleShare}
            className="p-2 rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-100 transition-colors relative"
            title="Share this legal tip"
          >
            <Share2 size={15} />
            {copied && (
              <span className="absolute -top-7 right-0 text-[10px] bg-stone-900 text-white px-2 py-0.5 rounded shadow">
                Copied!
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
