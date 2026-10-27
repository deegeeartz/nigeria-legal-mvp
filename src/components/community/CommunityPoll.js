"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Vote, CheckCircle2, Award, ChevronDown, ChevronUp, Scale, Users } from "lucide-react";

export function CommunityPoll({ initialPoll, onVoteSuccess }) {
  const [poll, setPoll] = useState(initialPoll);
  const [selectedOption, setSelectedOption] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showVerdict, setShowVerdict] = useState(true);

  useEffect(() => {
    if (initialPoll) {
      setPoll(initialPoll);
      // Check if user already voted locally
      try {
        const storedVotes = JSON.parse(localStorage.getItem("wigally_poll_votes") || "{}");
        if (storedVotes[initialPoll.id]) {
          setHasVoted(true);
          setSelectedOption(storedVotes[initialPoll.id]);
        }
      } catch {
        // ignore
      }
    }
  }, [initialPoll]);

  if (!poll) return null;

  const handleVote = async (optionId) => {
    if (hasVoted || isSubmitting) return;
    setIsSubmitting(true);
    setSelectedOption(optionId);

    try {
      const res = await fetch("/api/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "vote_poll",
          poll_id: poll.id,
          option_id: optionId
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.poll) {
          setPoll(data.poll);
        }
        setHasVoted(true);
        try {
          const storedVotes = JSON.parse(localStorage.getItem("wigally_poll_votes") || "{}");
          storedVotes[poll.id] = optionId;
          localStorage.setItem("wigally_poll_votes", JSON.stringify(storedVotes));
        } catch {
          // ignore
        }
        if (onVoteSuccess) onVoteSuccess(data.poll);
      }
    } catch (err) {
      console.error("Poll voting error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="editorial-card rounded-2xl p-6 sm:p-7 bg-white border border-stone-200 shadow-sm relative overflow-hidden">
      {/* Editorial Category Tag */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
            <Vote size={15} />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 font-mono">
              Community Dilemma Poll
            </span>
            <span className="text-[11px] text-stone-400 ml-2">● {poll.category}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-stone-500 font-mono">
          <Users size={13} />
          <span>{poll.total_votes || 0} votes</span>
        </div>
      </div>

      {/* Poll Question */}
      <div className="py-4">
        <h3 className="font-editorial text-xl sm:text-2xl font-bold text-stone-900 leading-snug">
          {poll.question}
        </h3>
        <p className="text-xs text-stone-500 mt-1">
          {hasVoted ? "Your vote is recorded. See how the community stands:" : "Cast your take anonymously to see lawyer & public breakdown:"}
        </p>
      </div>

      {/* Options List */}
      <div className="space-y-3">
        {poll.options?.map((option) => {
          const isSelected = selectedOption === option.id;
          const pct = option.percentage || 0;

          return (
            <button
              key={option.id}
              onClick={() => handleVote(option.id)}
              disabled={hasVoted || isSubmitting}
              className={`w-full text-left p-3.5 rounded-xl border transition-all relative overflow-hidden group ${
                isSelected
                  ? "border-emerald-600 bg-emerald-50/50 shadow-xs"
                  : hasVoted
                  ? "border-stone-200 bg-stone-50/60"
                  : "border-stone-200 hover:border-emerald-500 hover:bg-stone-50"
              }`}
            >
              {/* Progress background bar when voted */}
              {hasVoted && (
                <div
                  className={`absolute inset-y-0 left-0 transition-all duration-700 ${
                    isSelected ? "bg-emerald-200/60" : "bg-stone-200/60"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              )}

              <div className="relative flex items-center justify-between gap-3 z-10">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-stone-400 group-hover:border-emerald-600"
                    }`}
                  >
                    {isSelected && <CheckCircle2 size={13} strokeWidth={3} />}
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-stone-800 leading-snug">
                    {option.text}
                  </span>
                </div>

                {hasVoted && (
                  <span className="text-xs sm:text-sm font-bold font-mono text-stone-700 shrink-0">
                    {pct}%
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Lawyer Verdict Card */}
      {poll.lawyer_verdict && (
        <div className="mt-5 pt-4 border-t border-stone-200">
          <button
            onClick={() => setShowVerdict(!showVerdict)}
            className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-stone-700 hover:text-stone-900 transition-colors"
          >
            <span className="flex items-center gap-1.5 text-amber-900">
              <Scale size={14} className="text-amber-700" />
              Verified Counsel Legal Verdict
            </span>
            {showVerdict ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showVerdict && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-3 p-4 rounded-xl bg-amber-50/60 border border-amber-200/70"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="font-semibold text-xs text-stone-900">
                  {poll.lawyer_verdict.lawyer_name}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900 font-bold uppercase tracking-wider">
                  {poll.lawyer_verdict.badge}
                </span>
              </div>
              <p className="text-xs text-stone-700 leading-relaxed font-sans">
                {poll.lawyer_verdict.verdict_summary}
              </p>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
