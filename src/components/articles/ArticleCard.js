"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Heart,
  MessageSquare,
  Bookmark,
  Share2,
  Clock,
  ShieldCheck,
  Award,
  ArrowUpRight,
  Sparkles
} from "lucide-react";

export function ArticleCard({
  article,
  onOpenShare,
  onLikeToggle,
  onSaveToggle,
  isLiked = false,
  isSaved = false,
  likesCount = null,
  savesCount = null
}) {
  const [localLiked, setLocalLiked] = useState(isLiked);
  const [localSaved, setLocalSaved] = useState(isSaved);
  const [likes, setLikes] = useState(likesCount ?? article.metrics?.likes ?? 0);
  const [saves, setSaves] = useState(savesCount ?? article.metrics?.saves ?? 0);

  const handleLike = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const newLiked = !localLiked;
    const delta = newLiked ? 1 : -1;
    setLocalLiked(newLiked);
    setLikes((prev) => Math.max(0, prev + delta));

    if (onLikeToggle) {
      onLikeToggle(article.id, newLiked);
    } else {
      try {
        await fetch(`/api/articles/${article.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "like", delta })
        });
      } catch (err) {
        console.error("Like failed:", err);
      }
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const newSaved = !localSaved;
    const delta = newSaved ? 1 : -1;
    setLocalSaved(newSaved);
    setSaves((prev) => Math.max(0, prev + delta));

    if (onSaveToggle) {
      onSaveToggle(article.id, newSaved);
    } else {
      try {
        await fetch(`/api/articles/${article.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "save", delta })
        });
      } catch (err) {
        console.error("Save failed:", err);
      }
    }
  };

  const handleShareClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onOpenShare) {
      onOpenShare(article);
    }
  };

  return (
    <article className="bg-white rounded-3xl border border-stone-200/90 hover:border-stone-300 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col group">
      {/* Author Header */}
      <div className="p-5 pb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative">
            {article.author?.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={article.author.avatar}
                alt={article.author.name}
                className="w-11 h-11 rounded-full object-cover border border-stone-200 shrink-0"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-stone-900 text-amber-400 font-bold flex items-center justify-center text-sm shrink-0">
                {article.author?.initials || "LP"}
              </div>
            )}
            {article.author?.is_san && (
              <span
                title="Senior Advocate of Nigeria (SAN)"
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center font-black text-[9px] shadow-xs"
              >
                ★
              </span>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-black text-stone-900 truncate">
                {article.author?.name}
              </span>
              {article.author?.is_san && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                  SAN
                </span>
              )}
              <span className="text-[11px] text-emerald-700 flex items-center gap-0.5 font-bold">
                <ShieldCheck size={12} /> Verified
              </span>
            </div>
            <p className="text-xs text-stone-500 truncate font-medium">
              {article.author?.title} • {article.author?.nba_branch || "Nigerian Bar"}
            </p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className="text-[11px] font-semibold text-stone-400 block">
            {article.formatted_date || "Recent"}
          </span>
          <span className="text-[10px] font-mono font-bold text-amber-800 flex items-center justify-end gap-1 mt-0.5">
            <Clock size={11} /> {article.read_time_minutes} min read
          </span>
        </div>
      </div>

      {/* Main Link Area */}
      <Link href={`/articles/${article.slug || article.id}`} className="block flex-1">
        {/* Cover Image (if available) */}
        {article.cover_image && (
          <div className="h-48 sm:h-52 w-full overflow-hidden bg-stone-100 relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={article.cover_image}
              alt={article.title}
              className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
            />
            <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-xs font-bold bg-stone-900/85 text-amber-300 backdrop-blur-xs shadow-xs">
              {article.practice_area}
            </span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-5 space-y-2">
          {!article.cover_image && (
            <span className="inline-block px-2.5 py-0.5 rounded text-[11px] font-bold bg-stone-100 text-stone-700 mb-1">
              {article.practice_area}
            </span>
          )}
          <h2 className="text-lg sm:text-xl font-black text-stone-900 font-serif leading-snug group-hover:text-amber-900 transition-colors">
            {article.title}
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 line-clamp-2 font-medium leading-relaxed">
            {article.subtitle || article.excerpt}
          </p>

          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1.5">
              {article.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-[11px] font-mono text-stone-500 hover:text-stone-800"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </Link>

      {/* Social Engagement Footer */}
      <div className="px-5 py-3 border-t border-stone-100 bg-stone-50/50 flex items-center justify-between text-xs text-stone-600">
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Like Button */}
          <button
            onClick={handleLike}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
              localLiked
                ? "bg-rose-50 text-rose-600 border border-rose-200"
                : "hover:bg-stone-100 text-stone-600"
            }`}
            title="Applaud / Like publication"
          >
            <Heart
              size={15}
              className={localLiked ? "fill-rose-600 text-rose-600" : ""}
            />
            <span>{likes}</span>
          </button>

          {/* Comment Count / Link */}
          <Link
            href={`/articles/${article.slug || article.id}#comments`}
            className="px-3 py-1.5 rounded-xl hover:bg-stone-100 text-stone-600 font-bold flex items-center gap-1.5 transition-colors"
            title="View discussion thread"
          >
            <MessageSquare size={15} />
            <span>{article.metrics?.comments ?? article.comments?.length ?? 0}</span>
          </Link>

          {/* Bookmark / Save Button */}
          <button
            onClick={handleSave}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
              localSaved
                ? "bg-amber-50 text-amber-800 border border-amber-200"
                : "hover:bg-stone-100 text-stone-600"
            }`}
            title="Save to reading list"
          >
            <Bookmark
              size={15}
              className={localSaved ? "fill-amber-800 text-amber-800" : ""}
            />
            <span className="hidden sm:inline">{localSaved ? "Saved" : "Save"}</span>
          </button>
        </div>

        {/* Share Button (Outside the network) */}
        <button
          onClick={handleShareClick}
          className="px-3.5 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold flex items-center gap-1.5 shadow-2xs transition-all active:scale-95"
          title="Share to LinkedIn, WhatsApp, X outside Wigally"
        >
          <Share2 size={13} />
          <span>Share</span>
        </button>
      </div>
    </article>
  );
}
