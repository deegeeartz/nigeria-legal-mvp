"use client";

import { useState } from "react";
import {
  Share2,
  Copy,
  Check,
  Send,
  ExternalLink,
  X,
  MessageCircle,
  Mail,
  Globe,
  Briefcase
} from "lucide-react";

export function ShareModal({ article, isOpen, onClose, onShareSuccess }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !article) return null;

  // Construct absolute or relative URL
  const currentOrigin = typeof window !== "undefined" ? window.location.origin : "https://wigally.ng";
  const shareUrl = `${currentOrigin}/articles/${article.slug || article.id}`;
  const shareTitle = article.title;
  const shareText = `Read "${article.title}" by ${article.author?.name} on Wigally Legal Network:`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      if (onShareSuccess) onShareSuccess("copy");
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: `${article.subtitle || article.excerpt}`,
          url: shareUrl,
        });
        if (onShareSuccess) onShareSuccess("native");
        onClose();
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Native share error:", err);
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const shareLinks = [
    {
      name: "LinkedIn",
      icon: Briefcase,
      bg: "bg-[#0A66C2] hover:bg-[#084e96] text-white",
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      action: "linkedin"
    },
    {
      name: "WhatsApp",
      icon: MessageCircle,
      bg: "bg-[#25D366] hover:bg-[#1faa50] text-white",
      url: `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`,
      action: "whatsapp"
    },
    {
      name: "X (Twitter)",
      icon: Send,
      bg: "bg-slate-900 hover:bg-slate-800 text-white",
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(shareUrl)}&via=wigally_ng`,
      action: "twitter"
    },
    {
      name: "Email",
      icon: Mail,
      bg: "bg-stone-700 hover:bg-stone-800 text-white",
      url: `mailto:?subject=${encodeURIComponent(`Legal Insight: ${shareTitle}`)}&body=${encodeURIComponent(`${article.subtitle || article.excerpt}\n\nRead the full analysis by ${article.author?.name} here:\n${shareUrl}`)}`,
      action: "email"
    }
  ];

  const handleExternalClick = (action) => {
    if (onShareSuccess) onShareSuccess(action);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-3xl max-w-lg w-full border border-stone-200 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center">
              <Share2 size={16} />
            </div>
            <div>
              <h3 className="text-base font-black text-stone-900">Share Outside Wigally</h3>
              <p className="text-xs text-stone-500 font-medium">Broadcast legal publication to professional networks</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-stone-200/80 flex items-center justify-center text-stone-400 hover:text-stone-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Card Preview (LinkedIn/OG Style) */}
          <div className="border border-stone-200 rounded-2xl overflow-hidden bg-stone-50/50 shadow-xs">
            {article.cover_image && (
              <div className="h-32 w-full overflow-hidden bg-stone-200 relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={article.cover_image}
                  alt={article.title}
                  className="w-full h-full object-cover"
                />
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold bg-stone-900/80 text-amber-300 backdrop-blur-xs">
                  {article.practice_area}
                </span>
              </div>
            )}
            <div className="p-3.5 space-y-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-800">
                wigally.ng • Nigeria Legal Insights
              </span>
              <h4 className="text-xs font-black text-stone-900 line-clamp-2 leading-snug">
                {article.title}
              </h4>
              <p className="text-[11px] text-stone-500 line-clamp-1">
                By {article.author?.name} • {article.author?.title}
              </p>
            </div>
          </div>

          {/* Social Platforms Row */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block mb-2.5">
              Select Destination Network
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {shareLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.name}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => handleExternalClick(item.action)}
                    className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl font-bold text-xs transition-all shadow-xs active:scale-95 ${item.bg}`}
                  >
                    <Icon size={18} />
                    <span>{item.name}</span>
                  </a>
                );
              })}
            </div>
          </div>

          {/* Mobile / Native Device Share Trigger */}
          {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
            <button
              onClick={handleNativeShare}
              className="w-full py-2.5 px-4 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <Globe size={15} />
              <span>Open Native Phone / OS Share Sheet</span>
            </button>
          )}

          {/* Direct Link Copy Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block">
              Direct Article Link
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-stone-100 border border-stone-200 rounded-xl px-3 py-2 text-xs font-mono text-stone-700 truncate select-all">
                {shareUrl}
              </div>
              <button
                onClick={handleCopyLink}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs shrink-0 ${
                  copied
                    ? "bg-emerald-600 text-white"
                    : "bg-stone-900 hover:bg-stone-800 text-white"
                }`}
              >
                {copied ? (
                  <>
                    <Check size={14} /> Copied!
                  </>
                ) : (
                  <>
                    <Copy size={14} /> Copy Link
                  </>
                )}
              </button>
            </div>
            {copied && (
              <p className="text-[11px] font-semibold text-emerald-700 animate-in fade-in">
                ✓ Public link copied! Ready to paste into Slack, WhatsApp groups, or social feeds.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-stone-50 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
          <span>Compliant with Rule 10 (RPC 2023) Legal Publishing</span>
          <button
            onClick={onClose}
            className="font-bold text-stone-700 hover:text-stone-900"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
