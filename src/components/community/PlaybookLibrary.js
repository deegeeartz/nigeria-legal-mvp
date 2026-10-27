"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Bookmark,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
  FileText,
  ShieldCheck,
  ArrowRight,
  Share2,
  Copy,
  Check
} from "lucide-react";
import Link from "next/link";

export function PlaybookLibrary({ playbooks = [] }) {
  const [activePlaybookId, setActivePlaybookId] = useState(playbooks[0]?.id || "pb_freelancer");
  const [completedSteps, setCompletedSteps] = useState({});
  const [bookmarkedPlaybooks, setBookmarkedPlaybooks] = useState({});
  const [copiedClause, setCopiedClause] = useState(false);

  useEffect(() => {
    try {
      const savedSteps = localStorage.getItem("wigally_playbook_steps");
      if (savedSteps) setCompletedSteps(JSON.parse(savedSteps));
      const savedBookmarks = localStorage.getItem("wigally_bookmarked_playbooks");
      if (savedBookmarks) setBookmarkedPlaybooks(JSON.parse(savedBookmarks));
    } catch {
      // ignore
    }
  }, []);

  if (!playbooks || playbooks.length === 0) return null;

  const current = playbooks.find((p) => p.id === activePlaybookId) || playbooks[0];
  const isBookmarked = Boolean(bookmarkedPlaybooks[current.id]);

  const toggleStep = (stepId) => {
    const key = `${current.id}_${stepId}`;
    const updated = { ...completedSteps, [key]: !completedSteps[key] };
    setCompletedSteps(updated);
    try {
      localStorage.setItem("wigally_playbook_steps", JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const toggleBookmark = () => {
    const updated = { ...bookmarkedPlaybooks, [current.id]: !isBookmarked };
    setBookmarkedPlaybooks(updated);
    try {
      localStorage.setItem("wigally_bookmarked_playbooks", JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const copyClause = () => {
    if (current.sample_clause) {
      navigator.clipboard?.writeText?.(current.sample_clause);
      setCopiedClause(true);
      setTimeout(() => setCopiedClause(false), 2000);
    }
  };

  // Calculate completion percentage for current playbook
  const currentCompletedCount = current.steps.filter(
    (s) => completedSteps[`${current.id}_${s.id}`]
  ).length;
  const progressPercent = Math.round((currentCompletedCount / current.steps.length) * 100);

  return (
    <div className="editorial-card rounded-2xl bg-white border border-stone-200 overflow-hidden shadow-sm">
      {/* Editorial Navigation Tabs */}
      <div className="p-4 sm:p-5 bg-stone-50/80 border-b border-stone-200">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-stone-900 text-amber-400 flex items-center justify-center font-bold">
              <BookOpen size={16} />
            </div>
            <div>
              <h3 className="font-editorial text-lg font-bold text-stone-900">
                Legal Survival Playbooks
              </h3>
              <p className="text-xs text-stone-500">
                Battle-tested step-by-step guides with actionable clauses
              </p>
            </div>
          </div>

          <button
            onClick={toggleBookmark}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              isBookmarked
                ? "bg-amber-100 border-amber-300 text-amber-900"
                : "border-stone-200 text-stone-600 hover:bg-stone-100"
            }`}
          >
            <Bookmark size={14} fill={isBookmarked ? "currentColor" : "none"} />
            <span>{isBookmarked ? "Bookmarked" : "Bookmark Kit"}</span>
          </button>
        </div>

        {/* Playbook selector pills */}
        <div className="flex flex-wrap gap-2">
          {playbooks.map((pb) => (
            <button
              key={pb.id}
              onClick={() => setActivePlaybookId(pb.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activePlaybookId === pb.id
                  ? "bg-stone-900 text-white shadow-xs font-semibold"
                  : "bg-white border border-stone-200 text-stone-700 hover:bg-stone-100"
              }`}
            >
              {pb.title.split(" ")[1] || pb.title}
            </button>
          ))}
        </div>
      </div>

      {/* Playbook Active Content */}
      <div className="p-6 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-md">
            {current.badge}
          </span>
          <div className="flex items-center gap-3 text-xs text-stone-500">
            <span>{current.read_time}</span>
            <span>•</span>
            <span className="text-stone-700 font-semibold">{current.difficulty}</span>
          </div>
        </div>

        <h2 className="font-editorial text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight leading-snug">
          {current.title}
        </h2>
        <p className="text-sm text-stone-600 mt-2 leading-relaxed">
          {current.summary}
        </p>

        {/* Progress Bar */}
        <div className="mt-5 p-3.5 rounded-xl bg-stone-50 border border-stone-200/80">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-stone-700">Checklist Progress</span>
            <span className="font-mono text-stone-500 font-bold">
              {currentCompletedCount} of {current.steps.length} Steps Completed ({progressPercent}%)
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-stone-200 overflow-hidden">
            <div
              className="h-full bg-emerald-600 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Interactive Step Items */}
        <div className="mt-6 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-stone-500 font-mono mb-2">
            Action Protocol
          </div>
          {current.steps?.map((step, idx) => {
            const isDone = Boolean(completedSteps[`${current.id}_${step.id}`]);
            return (
              <div
                key={step.id}
                onClick={() => toggleStep(step.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  isDone
                    ? "bg-emerald-50/40 border-emerald-200/90 text-stone-800"
                    : "bg-white border-stone-200 hover:border-stone-300 hover:bg-stone-50/50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 text-stone-400 shrink-0">
                    {isDone ? (
                      <CheckSquare size={18} className="text-emerald-600" />
                    ) : (
                      <Square size={18} className="text-stone-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-stone-400">
                        Step 0{idx + 1}
                      </span>
                      <h4
                        className={`text-sm font-bold ${
                          isDone ? "text-stone-900 line-through decoration-emerald-500" : "text-stone-900"
                        }`}
                      >
                        {step.title}
                      </h4>
                    </div>
                    <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Copyable Legal Armor Clause */}
        {current.sample_clause && (
          <div className="mt-6 p-4 rounded-xl bg-amber-50/50 border border-amber-200/70">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5 font-mono">
                <FileText size={14} className="text-amber-700" />
                Copy-Paste Contract Protection Clause
              </span>
              <button
                onClick={copyClause}
                className="flex items-center gap-1 text-xs font-semibold text-amber-900 bg-amber-200/70 hover:bg-amber-200 px-2.5 py-1 rounded-md transition-colors"
              >
                {copiedClause ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedClause ? "Copied Clause!" : "Copy Clause"}</span>
              </button>
            </div>
            <p className="text-xs font-mono text-stone-800 bg-white p-3 rounded-lg border border-amber-200/60 leading-relaxed select-all">
              "{current.sample_clause}"
            </p>
          </div>
        )}

        {/* Escalation to Verified Counsel */}
        <div className="mt-6 pt-4 border-t border-stone-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-stone-600">
            <ShieldCheck size={16} className="text-emerald-700" />
            <span>Need counsel to issue this demand letter or review agreement?</span>
          </div>
          <Link
            href="/search"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold transition-colors"
          >
            <span>Find Specialist Counsel</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
