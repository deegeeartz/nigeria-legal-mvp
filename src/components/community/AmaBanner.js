"use client";

import { useState } from "react";
import { MessageSquare, Users, Send, CheckCircle2, Calendar, Star, ShieldCheck, FileText } from "lucide-react";

export function AmaBanner({ amas = [] }) {
  const [selectedAma, setSelectedAma] = useState(amas[0] || null);
  const [questionText, setQuestionText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!amas || amas.length === 0) return null;

  const activeAma = selectedAma || amas[0];
  const isOpen = activeAma.status === "live";

  const handleSubmitQuestion = async (e) => {
    e.preventDefault();
    if (!questionText.trim() || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit_ama_q",
          ama_id: activeAma.id,
          question_text: questionText.trim(),
          author: "Anonymous Community Guest"
        })
      });

      if (res.ok) {
        setSubmitted(true);
        setQuestionText("");
        setTimeout(() => setSubmitted(false), 4000);
      }
    } catch (err) {
      console.error("AMA question error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="editorial-card rounded-2xl p-6 sm:p-7 bg-stone-900 text-stone-100 border border-stone-800 shadow-md relative overflow-hidden">
      {/* Decorative Warm Ambient Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header with Text Forum Status & Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-stone-800 relative z-10">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-bold font-mono tracking-wider">
            <MessageSquare size={13} />
            <span>{isOpen ? "ACTIVE COUNSEL TEXT AMA" : "SCHEDULED TEXT Q&A"}</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-stone-400">
            <Users size={13} className="text-emerald-400" />
            <span>{activeAma.participants_count || activeAma.listeners_count || 48} members reading</span>
            <span className="text-stone-600">•</span>
            <ShieldCheck size={13} className="text-amber-400" />
            <span>{activeAma.lawyers_in_thread || activeAma.lawyers_in_room || 3} verified lawyers answering in text</span>
          </div>

          <span className="px-2 py-0.5 rounded bg-stone-800 text-[10px] font-mono text-stone-400 border border-stone-700">
            Chat & Discussions Only
          </span>
        </div>

        {/* Tab switch between AMAs if multiple */}
        {amas.length > 1 && (
          <div className="flex gap-1.5">
            {amas.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedAma(item)}
                className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                  activeAma.id === item.id
                    ? "bg-stone-700 text-white font-semibold"
                    : "text-stone-400 hover:text-stone-200 hover:bg-stone-800"
                }`}
              >
                {item.status === "live" ? "💬 Active Thread" : "🗓️ Upcoming"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main AMA Topic & Host Details */}
      <div className="py-5 relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        <div className="md:col-span-2">
          <div className="text-xs uppercase tracking-wider text-amber-400 font-semibold mb-1">
            Focus Topic • Written Deliberation
          </div>
          <h3 className="font-editorial text-2xl sm:text-3xl font-bold text-white tracking-tight leading-snug">
            {activeAma.title}
          </h3>
          <p className="text-sm text-stone-300 mt-2 leading-relaxed">
            {activeAma.topic}
          </p>

          {isOpen && activeAma.current_question && (
            <div className="mt-4 p-3 rounded-xl bg-stone-800/80 border border-stone-700 text-xs text-stone-300 flex items-start gap-2.5">
              <span className="text-amber-400 font-bold uppercase shrink-0">Deliberating Now:</span>
              <span className="italic">"{activeAma.current_question}"</span>
            </div>
          )}
        </div>

        {/* Host Lawyer Card */}
        <div className="p-4 rounded-xl bg-stone-800/70 border border-stone-700 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold flex items-center justify-center text-lg shrink-0">
            {activeAma.host.avatar_initials}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="font-bold text-sm text-white">{activeAma.host.name}</h4>
              <span className="text-[10px] text-amber-400 font-mono flex items-center gap-0.5">
                <Star size={10} fill="currentColor" /> {activeAma.host.rating}
              </span>
            </div>
            <p className="text-xs text-stone-400">{activeAma.host.title}</p>
            <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-medium">
              Verified Legal Respondent
            </span>
          </div>
        </div>
      </div>

      {/* Ask a Question in Text form */}
      <div className="pt-4 border-t border-stone-800 relative z-10">
        {isOpen ? (
          <form onSubmit={handleSubmitQuestion} className="flex gap-2.5">
            <input
              type="text"
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Drop a text question for counsel to answer in this forum (anonymously)..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-stone-800 border border-stone-700 text-sm text-white placeholder-stone-400 focus:outline-none focus:border-amber-400 transition-colors"
            />
            <button
              type="submit"
              disabled={isSubmitting || !questionText.trim()}
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 transition-colors shrink-0 shadow-sm"
            >
              <Send size={14} />
              <span>Post to Forum</span>
            </button>
          </form>
        ) : (
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span className="flex items-center gap-2">
              <Calendar size={14} className="text-amber-400" />
              <span>Text discussion opens {activeAma.scheduled_time}</span>
            </span>
            <span className="text-xs text-amber-300 font-mono">
              Bookmark & return to read counsel answers
            </span>
          </div>
        )}

        {submitted && (
          <div className="mt-2 text-xs text-emerald-400 flex items-center gap-1.5 font-medium">
            <CheckCircle2 size={13} />
            <span>Question posted! Participating counsel will reply in this discussion thread.</span>
          </div>
        )}
      </div>
    </div>
  );
}
