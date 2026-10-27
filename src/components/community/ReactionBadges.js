"use client";

import { useState } from "react";
import { REACTION_TYPES } from "@/lib/communityData";

export function ReactionBadges({ questionId, initialReactions = {}, onReact }) {
  const [reactions, setReactions] = useState(
    initialReactions || { sound: 0, lifesaver: 0, clarify: 0, debate: 0 }
  );
  const [userReacted, setUserReacted] = useState({});
  const [isReacting, setIsReacting] = useState(false);

  const handleReact = async (key) => {
    if (isReacting) return;
    setIsReacting(true);

    const prevCount = reactions[key] || 0;
    const newCount = prevCount + 1;
    setReactions((prev) => ({ ...prev, [key]: newCount }));
    setUserReacted((prev) => ({ ...prev, [key]: true }));

    try {
      const res = await fetch("/api/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "react_question",
          question_id: questionId,
          reaction_key: key
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.reactions) {
          setReactions(data.reactions);
        }
      }
    } catch (err) {
      console.error("Reaction failed:", err);
    } finally {
      setIsReacting(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
      {REACTION_TYPES.map((type) => {
        const count = reactions[type.key] || 0;
        const hasReacted = Boolean(userReacted[type.key]);

        return (
          <button
            key={type.key}
            onClick={() => handleReact(type.key)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${
              hasReacted
                ? "bg-amber-100 border-amber-300 text-amber-900 shadow-xs"
                : "bg-stone-50 border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-100"
            }`}
            title={`React with ${type.label}`}
          >
            <span>{type.emoji}</span>
            <span className="hidden sm:inline text-[11px] font-sans">{type.label}</span>
            <span className="font-mono text-[11px] font-bold text-stone-700 ml-0.5">
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
