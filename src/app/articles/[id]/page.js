"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { ShareModal } from "@/components/articles/ShareModal";
import {
  Heart,
  MessageSquare,
  Bookmark,
  Share2,
  Clock,
  ShieldCheck,
  Award,
  ArrowLeft,
  Send,
  CheckCircle2,
  AlertCircle,
  Copy,
  MessageCircle,
  Scale,
  Sparkles,
  BookOpen
} from "lucide-react";

export default function ArticleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const articleId = params?.id;

  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Interaction states
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [savesCount, setSavesCount] = useState(0);
  const [sharesCount, setSharesCount] = useState(0);

  // Comments state
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  // Sharing
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    async function loadArticle() {
      if (!articleId) return;
      try {
        setLoading(true);
        const res = await fetch(`/api/articles/${articleId}`);
        const data = await res.json();
        if (data.status === "success" && data.article) {
          setArticle(data.article);
          setLikesCount(data.article.metrics?.likes || 0);
          setSavesCount(data.article.metrics?.saves || 0);
          setSharesCount(data.article.metrics?.shares || 0);
          setComments(data.article.comments || []);
        } else {
          setError(data.message || "Article not found");
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load article content");
      } finally {
        setLoading(false);
      }
    }

    loadArticle();
  }, [articleId]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleLike = async () => {
    const newLiked = !liked;
    const delta = newLiked ? 1 : -1;
    setLiked(newLiked);
    setLikesCount((prev) => Math.max(0, prev + delta));

    try {
      await fetch(`/api/articles/${articleId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "like", delta })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    const newSaved = !saved;
    const delta = newSaved ? 1 : -1;
    setSaved(newSaved);
    setSavesCount((prev) => Math.max(0, prev + delta));
    showToast(newSaved ? "Saved to your reading library" : "Removed from saved articles");

    try {
      await fetch(`/api/articles/${articleId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", delta })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmittingComment(true);
    try {
      const authorName = user?.full_name || "Barr. Babatunde Adeleke";
      const authorRole = user?.role === "lawyer" ? "Verified Legal Practitioner" : "Verified Client";
      const authorBadge = user?.role === "lawyer" ? "Lagos Bar" : "Client Member";

      const res = await fetch(`/api/articles/${articleId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "comment",
          text: newComment.trim(),
          author_name: authorName,
          author_role: authorRole,
          author_badge: authorBadge,
          author_avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80"
        })
      });

      const data = await res.json();
      if (data.status === "success" && data.comment) {
        setComments((prev) => [data.comment, ...prev]);
        setNewComment("");
        showToast("✓ Your comment has been posted to the deliberation thread");
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to post comment");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleShareSuccess = (platform) => {
    setSharesCount((prev) => prev + 1);
    showToast(`Shared via ${platform}! Link shared outside the network.`);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 bg-stone-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-stone-500">Loading legal publication...</p>
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="flex-1 max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
          <AlertCircle size={28} />
        </div>
        <h2 className="text-2xl font-black text-stone-900 font-serif">Article Not Found</h2>
        <p className="text-sm text-stone-600">{error || "The requested legal publication could not be located."}</p>
        <Link
          href="/articles"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-stone-900 text-white text-xs font-bold shadow-sm"
        >
          <ArrowLeft size={14} /> Back to Legal Publications
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-stone-100/60 pb-24 md:pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 md:bottom-6 right-6 z-50 bg-stone-900 text-amber-300 border border-stone-700 px-4 py-3 rounded-2xl shadow-xl text-xs font-bold flex items-center gap-2 animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Breadcrumb & Action Bar */}
      <div className="bg-stone-50 border-b border-stone-200 sticky top-14 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <Link
            href="/articles"
            className="text-xs font-bold text-stone-600 hover:text-stone-900 flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft size={14} />
            <span>All Articles</span>
          </Link>

          {/* Floating Actions on Top */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleLike}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                liked
                  ? "bg-rose-50 text-rose-600 border border-rose-200"
                  : "bg-white text-stone-700 hover:bg-stone-100 border border-stone-200"
              }`}
            >
              <Heart size={14} className={liked ? "fill-rose-600 text-rose-600" : ""} />
              <span>{likesCount}</span>
            </button>

            <button
              onClick={handleSave}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                saved
                  ? "bg-amber-100 text-amber-900 border border-amber-300"
                  : "bg-white text-stone-700 hover:bg-stone-100 border border-stone-200"
              }`}
            >
              <Bookmark size={14} className={saved ? "fill-amber-900 text-amber-900" : ""} />
              <span className="hidden sm:inline">{saved ? "Saved" : "Save"}</span>
            </button>

            <button
              onClick={() => setIsShareModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
            >
              <Share2 size={13} />
              <span>Share Outside</span>
            </button>
          </div>
        </div>
      </div>

      {/* Article Article Body Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 space-y-8">
        <article className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden p-6 sm:p-10 space-y-8">
          {/* Metadata & Practice Area Header */}
          <div className="space-y-4 pb-6 border-b border-stone-100">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-200">
                {article.practice_area}
              </span>
              <span className="text-xs font-mono text-stone-400 flex items-center gap-1">
                <Clock size={12} /> {article.read_time_minutes} min read
              </span>
              <span className="text-xs text-stone-400">•</span>
              <span className="text-xs font-semibold text-stone-500">
                {article.formatted_date || "Published recently"}
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-stone-900 font-serif leading-tight tracking-tight">
              {article.title}
            </h1>

            {article.subtitle && (
              <p className="text-base sm:text-lg text-stone-600 font-serif italic leading-relaxed">
                {article.subtitle}
              </p>
            )}
          </div>

          {/* Author Byline Card (LinkedIn Style) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-stone-50 border border-stone-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="relative">
                {article.author?.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={article.author.avatar}
                    alt={article.author.name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-xs"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-stone-900 text-amber-400 font-bold flex items-center justify-center text-lg shadow-xs">
                    {article.author?.initials || "LP"}
                  </div>
                )}
                {article.author?.is_san && (
                  <span
                    title="Senior Advocate of Nigeria"
                    className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center font-black text-[10px] shadow-xs"
                  >
                    ★
                  </span>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-black text-stone-900">
                    {article.author?.name}
                  </h3>
                  {article.author?.is_san && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                      Senior Advocate of Nigeria (SAN)
                    </span>
                  )}
                  <span className="text-xs text-emerald-700 font-bold flex items-center gap-0.5">
                    <ShieldCheck size={13} /> NBA Verified
                  </span>
                </div>
                <p className="text-xs text-stone-600 font-medium">
                  {article.author?.title} • {article.author?.firm || "Legal Practitioner"}
                </p>
                <p className="text-[11px] text-stone-400 font-mono mt-0.5">
                  Enrollment: {article.author?.bar_enrollment || "SCN Verified"} • {article.author?.nba_branch}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:self-center shrink-0">
              <button
                onClick={() => showToast(`Connected to ${article.author?.name} network updates!`)}
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-all"
              >
                + Connect
              </button>
              <Link
                href={`/search?name=${encodeURIComponent(article.author?.name || "")}`}
                className="px-3 py-2 bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-xl text-xs font-bold transition-colors"
              >
                Profile
              </Link>
            </div>
          </div>

          {/* Full Cover Image Banner */}
          {article.cover_image && (
            <div className="rounded-2xl overflow-hidden border border-stone-200 max-h-96 w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={article.cover_image}
                alt={article.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Editorial Content Body */}
          <div className="prose prose-stone max-w-none font-serif text-stone-800 text-base sm:text-lg leading-relaxed space-y-6">
            {article.content.split("\n\n").map((block, idx) => {
              const trimmed = block.trim();
              if (trimmed.startsWith("### ")) {
                return (
                  <h3
                    key={idx}
                    className="text-xl sm:text-2xl font-black text-stone-900 font-serif pt-4 pb-1 border-b border-stone-100"
                  >
                    {trimmed.replace("### ", "")}
                  </h3>
                );
              }
              if (trimmed.startsWith("> ")) {
                return (
                  <blockquote
                    key={idx}
                    className="border-l-4 border-amber-500 pl-4 py-2 my-4 bg-amber-50/50 rounded-r-xl italic text-stone-800 font-medium"
                  >
                    {trimmed.replace(/^>\s*/, "").replace(/\*\*/g, "")}
                  </blockquote>
                );
              }
              if (trimmed.startsWith("1. ") || trimmed.startsWith("- ")) {
                const items = trimmed.split("\n");
                return (
                  <ul key={idx} className="list-disc pl-6 space-y-2 text-stone-700">
                    {items.map((it, itemIdx) => (
                      <li key={itemIdx} className="leading-relaxed">
                        {it.replace(/^(\d+\.|\-)\s*/, "")}
                      </li>
                    ))}
                  </ul>
                );
              }
              return (
                <p key={idx} className="leading-relaxed text-stone-800">
                  {trimmed}
                </p>
              );
            })}
          </div>

          {/* Statutory Disclaimer & Tags */}
          <div className="pt-6 border-t border-stone-200 space-y-4">
            {article.tags && article.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {article.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 rounded-xl bg-stone-100 text-stone-700 text-xs font-mono font-semibold"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed font-medium">
              <span className="font-bold">Rule 10 & 39 Ethical Disclosure:</span> This article is published for informational and continuing legal educational purposes. It does not constitute direct attorney-client retainer advice without formal engagement deed.
            </div>
          </div>

          {/* Social Interaction Bar */}
          <div className="p-4 sm:p-5 rounded-2xl bg-stone-50 border border-stone-200 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={handleLike}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                  liked
                    ? "bg-rose-500 text-white shadow-sm"
                    : "bg-white hover:bg-stone-200 text-stone-700 border border-stone-200"
                }`}
              >
                <Heart size={16} className={liked ? "fill-white" : ""} />
                <span>{liked ? "Applauded" : "Applaud Article"} ({likesCount})</span>
              </button>

              <button
                onClick={handleSave}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                  saved
                    ? "bg-amber-600 text-white shadow-sm"
                    : "bg-white hover:bg-stone-200 text-stone-700 border border-stone-200"
                }`}
              >
                <Bookmark size={16} className={saved ? "fill-white" : ""} />
                <span>{saved ? "Saved to Library" : "Bookmark"} ({savesCount})</span>
              </button>
            </div>

            <button
              onClick={() => setIsShareModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all active:scale-95"
            >
              <Share2 size={16} />
              <span>Share to LinkedIn / WhatsApp ({sharesCount})</span>
            </button>
          </div>
        </article>

        {/* Comment & Deliberation Section */}
        <section id="comments" className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-10 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-stone-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                <MessageSquare size={16} />
              </div>
              <h3 className="text-lg font-black text-stone-900 font-serif">
                Deliberations & Comments ({comments.length})
              </h3>
            </div>
            <span className="text-xs text-stone-400 font-medium">Colleague & Client Discussions</span>
          </div>

          {/* Add Comment Box */}
          <form onSubmit={handleCommentSubmit} className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-stone-900 text-amber-400 flex items-center justify-center font-bold text-sm shrink-0">
                {user?.full_name?.charAt(0) || "U"}
              </div>
              <div className="flex-1 space-y-2">
                <textarea
                  rows={3}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={`Join the deliberation as ${user?.full_name || "Counsel"}... Add practical observations, statutory nuances, or client questions.`}
                  className="w-full px-4 py-3 rounded-2xl border border-stone-300 text-stone-900 text-xs sm:text-sm placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-stone-900 font-medium"
                />
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-stone-400">
                    Commenting as: <strong className="text-stone-700">{user?.full_name || "Learned Colleague"}</strong>
                  </span>
                  <button
                    type="submit"
                    disabled={submittingComment || !newComment.trim()}
                    className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    <Send size={13} />
                    <span>{submittingComment ? "Posting..." : "Post Comment"}</span>
                  </button>
                </div>
              </div>
            </div>
          </form>

          {/* Comments List */}
          <div className="space-y-4 pt-4">
            {comments.length === 0 ? (
              <p className="text-xs text-stone-500 italic text-center py-6">
                Be the first to deliberate or comment on this publication.
              </p>
            ) : (
              comments.map((comment) => (
                <div
                  key={comment.id}
                  className="p-4 rounded-2xl bg-stone-50/80 border border-stone-200/80 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      {comment.author_avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={comment.author_avatar}
                          alt={comment.author_name}
                          className="w-8 h-8 rounded-full object-cover border border-stone-200"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-stone-900 text-amber-400 font-bold text-xs flex items-center justify-center">
                          {comment.author_name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-stone-900">
                            {comment.author_name}
                          </span>
                          {comment.author_badge && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-stone-200 text-stone-700">
                              {comment.author_badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-stone-500 font-medium">
                          {comment.author_role}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] text-stone-400 font-mono">
                      {comment.created_at}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-stone-800 font-medium leading-relaxed pl-10">
                    {comment.text}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      {/* Share Modal */}
      <ShareModal
        article={article}
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        onShareSuccess={handleShareSuccess}
      />
    </div>
  );
}
