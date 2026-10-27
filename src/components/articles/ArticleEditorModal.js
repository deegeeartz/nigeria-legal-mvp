"use client";

import { useState } from "react";
import {
  X,
  FileEdit,
  Sparkles,
  Image,
  BookOpen,
  Send,
  Eye,
  Check,
  AlertCircle
} from "lucide-react";

const COVER_PRESETS = [
  {
    name: "Law Library",
    url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80"
  },
  {
    name: "Modern Boardroom",
    url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80"
  },
  {
    name: "Supreme Court Gavel",
    url: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80"
  },
  {
    name: "Tech & Corporate Tower",
    url: "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=1200&q=80"
  }
];

export function ArticleEditorModal({ isOpen, onClose, onPublished, currentLawyer }) {
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [practiceArea, setPracticeArea] = useState("Corporate & Startups");
  const [coverImage, setCoverImage] = useState(COVER_PRESETS[0].url);
  const [content, setContent] = useState("");
  const [tagsInput, setTagsInput] = useState("NigerianLaw, CorporateGovernance, CAMA2020");
  const [isPreview, setIsPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const readTime = Math.max(1, Math.round(wordCount / 200));

  const handlePublish = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError("Please provide both an article title and content body.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim().replace(/^#/, ""))
        .filter(Boolean);

      const res = await fetch("/api/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          subtitle: subtitle.trim(),
          excerpt: subtitle.trim() || content.trim().slice(0, 180) + "...",
          content: content.trim(),
          practice_area: practiceArea,
          cover_image: coverImage,
          author_id: currentLawyer?.lawyer_id || "lw_001",
          author_name: currentLawyer?.full_name || "Barr. Amaka Okonkwo",
          author_title: currentLawyer?.title || "Corporate & Commercial Counsel",
          author_firm: currentLawyer?.firm || "Okonkwo & Associates Legal Practitioners",
          nba_branch: "Lagos Branch",
          is_san: Boolean(currentLawyer?.is_san),
          tags
        })
      });

      const data = await res.json();
      if (!res.ok || data.status !== "success") {
        throw new Error(data.message || "Failed to publish article");
      }

      if (onPublished) onPublished(data.article);
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || "An error occurred while publishing.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const insertSnippet = (prefix, suffix = "") => {
    setContent((prev) => prev + `\n${prefix}Your legal analysis or authority here${suffix}\n`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div
        className="bg-white rounded-3xl max-w-3xl w-full border border-stone-200 shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-stone-900 text-amber-400 flex items-center justify-center">
              <FileEdit size={16} />
            </div>
            <div>
              <h3 className="text-base font-black text-stone-900 font-serif">Publish Legal Insight</h3>
              <p className="text-xs text-stone-500 font-medium">LinkedIn-style professional publishing for Nigerian legal minds</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPreview(!isPreview)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border ${
                isPreview
                  ? "bg-amber-100 text-amber-900 border-amber-300"
                  : "bg-white text-stone-700 border-stone-200 hover:bg-stone-50"
              }`}
            >
              <Eye size={14} />
              <span>{isPreview ? "Edit Mode" : "Preview"}</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-stone-200/70 flex items-center justify-center text-stone-400 hover:text-stone-700 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {error && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {isPreview ? (
            /* Preview Mode */
            <div className="space-y-6">
              {coverImage && (
                <div className="h-48 rounded-2xl overflow-hidden border border-stone-200 relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverImage} alt="Cover preview" className="w-full h-full object-cover" />
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-xs font-bold bg-stone-900/90 text-amber-300 backdrop-blur-xs">
                    {practiceArea}
                  </span>
                </div>
              )}
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold uppercase text-amber-800 tracking-wider">
                  {readTime} min read • Draft Preview
                </span>
                <h1 className="text-2xl font-black text-stone-900 font-serif leading-tight">
                  {title || "Untitled Legal Publication"}
                </h1>
                {subtitle && (
                  <p className="text-sm text-stone-600 font-medium italic">
                    {subtitle}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-2xl border border-stone-200">
                <div className="w-10 h-10 rounded-full bg-stone-900 text-amber-400 flex items-center justify-center font-bold text-sm">
                  {currentLawyer?.full_name?.charAt(0) || "A"}
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-900">{currentLawyer?.full_name || "Barr. Amaka Okonkwo"}</p>
                  <p className="text-[11px] text-stone-500">NBA Lagos Branch • Supreme Court Enrolled</p>
                </div>
              </div>
              <div className="prose prose-stone max-w-none text-stone-800 text-sm whitespace-pre-line leading-relaxed font-serif">
                {content || "No body content written yet."}
              </div>
            </div>
          ) : (
            /* Editor Form */
            <form onSubmit={handlePublish} id="article-form" className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-stone-500 tracking-wider block mb-1.5">
                  Article Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Navigating Section 305 of CAMA 2020: Fiduciary Duties of Nigerian Startup Boards"
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-stone-900 font-serif text-base placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-stone-900 font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-stone-500 tracking-wider block mb-1.5">
                  Subtitle / Executive Hook
                </label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="A one-line synthesis of the legal position, statute citation, or practical impact"
                  className="w-full px-4 py-2 rounded-xl border border-stone-300 text-stone-800 text-xs placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-stone-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase text-stone-500 tracking-wider block mb-1.5">
                    Practice Area / Domain
                  </label>
                  <select
                    value={practiceArea}
                    onChange={(e) => setPracticeArea(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-stone-900 text-xs font-semibold bg-white focus:outline-hidden focus:ring-2 focus:ring-stone-900"
                  >
                    <option value="Corporate & Startups">Corporate & Startups</option>
                    <option value="Labour & Employment">Labour & Employment</option>
                    <option value="Property & Real Estate">Property & Real Estate</option>
                    <option value="Tech, IP & Media">Tech, IP & Media</option>
                    <option value="Banking & FinTech">Banking & FinTech</option>
                    <option value="Litigation & Arbitration">Litigation & Arbitration</option>
                    <option value="Criminal & Civil Rights">Criminal & Civil Rights</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-stone-500 tracking-wider block mb-1.5">
                    Hashtags & Topics (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="CAMA2020, NigerianLaw, TechStartups"
                    className="w-full px-4 py-2 rounded-xl border border-stone-300 text-stone-800 text-xs font-mono placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-stone-900"
                  />
                </div>
              </div>

              {/* Cover Photo Presets */}
              <div>
                <label className="text-xs font-bold uppercase text-stone-500 tracking-wider block mb-1.5">
                  Cover Photo
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                  {COVER_PRESETS.map((preset) => (
                    <button
                      type="button"
                      key={preset.name}
                      onClick={() => setCoverImage(preset.url)}
                      className={`relative rounded-xl overflow-hidden h-16 border-2 transition-all ${
                        coverImage === preset.url
                          ? "border-amber-600 scale-[1.02] shadow-sm"
                          : "border-transparent opacity-70 hover:opacity-100"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-stone-900/80 text-white">
                        {preset.name}
                      </span>
                    </button>
                  ))}
                </div>
                <input
                  type="url"
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  placeholder="Or paste custom image URL..."
                  className="w-full px-3.5 py-1.5 rounded-xl border border-stone-200 text-stone-700 text-xs font-mono placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-stone-900"
                />
              </div>

              {/* Formatting Helper Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-100">
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mr-1">
                  Insert:
                </span>
                <button
                  type="button"
                  onClick={() => insertSnippet("### ", "")}
                  className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold"
                >
                  Subheading
                </button>
                <button
                  type="button"
                  onClick={() => insertSnippet('> *"', '"* — Citation (Year)')}
                  className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold"
                >
                  Court Precedent / Quote
                </button>
                <button
                  type="button"
                  onClick={() => insertSnippet("- ")}
                  className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold"
                >
                  Checklist Item
                </button>
              </div>

              {/* Body Content Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase text-stone-500 tracking-wider">
                    Editorial Body (Markdown Supported) *
                  </label>
                  <span className="text-xs font-mono text-stone-400">
                    {wordCount} words • ~{readTime} min read
                  </span>
                </div>
                <textarea
                  required
                  rows={10}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Draft your analysis here. Reference Nigerian court judgments, constitutional sections, and actionable practitioner guidance..."
                  className="w-full px-4 py-3 rounded-2xl border border-stone-300 text-stone-900 font-serif text-sm placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-stone-900 leading-relaxed"
                />
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-stone-50 border-t border-stone-100 flex items-center justify-between shrink-0">
          <div className="text-xs text-stone-500 font-medium">
            Published under <span className="font-bold text-stone-800">Rule 10 (RPC 2023)</span> knowledge sharing
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePublish}
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 active:scale-95 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Send size={14} />
                  Publish to Network
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
