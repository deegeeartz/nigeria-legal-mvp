"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { ArticleCard } from "@/components/articles/ArticleCard";
import { ArticleEditorModal } from "@/components/articles/ArticleEditorModal";
import { ShareModal } from "@/components/articles/ShareModal";
import { ARTICLE_TOPICS } from "@/lib/articleData";
import {
  FileText,
  PenTool,
  Search,
  Filter,
  Sparkles,
  Award,
  TrendingUp,
  ShieldCheck,
  Scale,
  Share2,
  Bookmark,
  CheckCircle2,
  ArrowRight,
  BookOpen
} from "lucide-react";

export default function ArticlesPage() {
  const { user } = useAuth();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("latest");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [activeShareArticle, setActiveShareArticle] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // User interaction states
  const [likedArticles, setLikedArticles] = useState({});
  const [savedArticles, setSavedArticles] = useState({});

  const isLawyer = user?.role === "lawyer";

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedTopic && selectedTopic !== "All") params.set("topic", selectedTopic);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (sortBy) params.set("sort", sortBy);

      const res = await fetch(`/api/articles?${params.toString()}`);
      const data = await res.json();
      if (data.status === "success") {
        setArticles(data.articles || []);
      }
    } catch (err) {
      console.error("Failed to load articles:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, [selectedTopic, sortBy]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchArticles();
  };

  const handleArticlePublished = (newArticle) => {
    setArticles((prev) => [newArticle, ...prev]);
    showToast("✓ Article published to Wigally Legal Network!");
  };

  const handleShareSuccess = (platform) => {
    showToast(`Shared via ${platform}! Outside network link recorded.`);
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const featuredArticle = articles.length > 0 ? articles[0] : null;
  const regularArticles = articles.length > 1 ? articles.slice(1) : [];

  return (
    <div className="flex-1 bg-stone-100/50 pb-20 md:pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 md:bottom-6 right-6 z-50 bg-stone-900 text-amber-300 border border-stone-700 px-4 py-3 rounded-2xl shadow-xl text-xs font-bold flex items-center gap-2 animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hero / Header Section */}
      <section className="bg-stone-900 text-stone-100 pt-10 pb-16 px-4 md:px-8 border-b border-stone-800">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1.5">
                  <Sparkles size={12} />
                  Nigerian Legal Publications & Pulse
                </span>
                <span className="text-xs text-stone-400 font-medium hidden sm:inline">
                  • Rule 10 Compliant
                </span>
              </div>
              <h1 className="text-3xl md:text-5xl font-black font-serif tracking-tight leading-tight">
                Peer-Reviewed Legal Analysis & Practice Insights
              </h1>
              <p className="text-sm md:text-base text-stone-300 font-medium leading-relaxed">
                Authored by Senior Advocates of Nigeria (SAN) and verified Nigerian legal practitioners. 
                Deliberate, applaud, save to your library, and share outside the network.
              </p>
            </div>

            {/* Write Article Action */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <button
                onClick={() => setIsEditorOpen(true)}
                className="px-5 py-3.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <PenTool size={16} />
                <span>Write an Article</span>
              </button>
              <Link
                href="/community"
                className="px-4 py-3 bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs rounded-2xl border border-stone-700 transition-colors flex items-center justify-center gap-2"
              >
                <span>Legal Lounge Q&A</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="pt-2">
            <div className="relative max-w-2xl">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search articles by statute, precedent, author, or practice topic (e.g. CAMA 2020, NICN, Tenancy)..."
                className="w-full pl-11 pr-24 py-3.5 rounded-2xl bg-stone-800/90 border border-stone-700 text-stone-100 placeholder:text-stone-400 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-400 shadow-inner"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-stone-700 hover:bg-stone-600 text-stone-200 text-xs font-bold rounded-xl transition-colors"
              >
                Search
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 -mt-6 space-y-8">
        {/* Practice Area Filter Bar */}
        <div className="bg-white rounded-2xl p-2.5 border border-stone-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 overflow-x-auto">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {ARTICLE_TOPICS.map((topic) => {
              const active = selectedTopic === topic;
              return (
                <button
                  key={topic}
                  onClick={() => setSelectedTopic(topic)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    active
                      ? "bg-stone-900 text-white shadow-xs"
                      : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                  }`}
                >
                  {topic}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-stone-100">
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
              Sort:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2.5 py-1 rounded-xl border border-stone-200 text-xs font-semibold text-stone-800 bg-stone-50 focus:outline-hidden focus:ring-1 focus:ring-stone-900"
            >
              <option value="latest">Latest First</option>
              <option value="popular">Most Applauded</option>
              <option value="discussed">Most Discussed</option>
            </select>
          </div>
        </div>

        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Feed Column (2 Cols) */}
          <div className="lg:col-span-2 space-y-6">
            {loading ? (
              <div className="bg-white rounded-3xl p-12 border border-stone-200 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-semibold text-stone-500">Loading published insights...</p>
              </div>
            ) : articles.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 border border-stone-200 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center mx-auto">
                  <BookOpen size={24} />
                </div>
                <h3 className="text-base font-black text-stone-900">No Articles Found</h3>
                <p className="text-xs text-stone-500 max-w-md mx-auto">
                  No published insights matched your selected filter or search term. Try another practice area or write the first article on this subject!
                </p>
                <button
                  onClick={() => setIsEditorOpen(true)}
                  className="px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <PenTool size={13} /> Write First Article
                </button>
              </div>
            ) : (
              <>
                {/* Featured Top Editorial Story */}
                {featuredArticle && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 uppercase tracking-wider">
                      <Sparkles size={14} className="text-amber-600" />
                      <span>Featured Legal Perspective</span>
                    </div>
                    <ArticleCard
                      article={featuredArticle}
                      onOpenShare={(art) => setActiveShareArticle(art)}
                    />
                  </div>
                )}

                {/* Rest of Articles */}
                {regularArticles.length > 0 && (
                  <div className="space-y-5 pt-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-stone-400">
                      Recent Publications ({regularArticles.length})
                    </h3>
                    <div className="grid grid-cols-1 gap-6">
                      {regularArticles.map((article) => (
                        <ArticleCard
                          key={article.id}
                          article={article}
                          onOpenShare={(art) => setActiveShareArticle(art)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right Sidebar (1 Col): Top Authors, Trending Topics, Network Info */}
          <div className="space-y-6">
            {/* Top Contributing Senior Advocates & Counsel */}
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <h3 className="text-sm font-black text-stone-900 flex items-center gap-2">
                  <Award size={16} className="text-amber-600" />
                  Top Legal Contributors
                </h3>
                <span className="text-[11px] font-bold text-stone-400">NBA Verified</span>
              </div>

              <div className="space-y-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-stone-900 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0">
                      IY
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-stone-900 truncate">Ibrahim Yusuf SAN</p>
                      <p className="text-[11px] text-stone-500 truncate">Abuja Bar • 14 Yrs</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    3.8k Readers
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-emerald-800 text-emerald-100 flex items-center justify-center font-bold text-xs shrink-0">
                      AO
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-stone-900 truncate">Barr. Amaka Okonkwo</p>
                      <p className="text-[11px] text-stone-500 truncate">Lagos Bar • Corporate & Labour</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    1.4k Readers
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-amber-700 text-white flex items-center justify-center font-bold text-xs shrink-0">
                      KA
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-stone-900 truncate">Kemi Adegoke SAN</p>
                      <p className="text-[11px] text-stone-500 truncate">Lagos Bar • Real Estate & ADR</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    2.7k Readers
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-stone-100">
                <Link
                  href="/search"
                  className="text-xs font-bold text-amber-900 hover:text-amber-800 flex items-center gap-1"
                >
                  View all verified practitioners in directory →
                </Link>
              </div>
            </div>

            {/* Trending Statutory Discussions */}
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-4">
              <h3 className="text-sm font-black text-stone-900 flex items-center gap-2">
                <TrendingUp size={16} className="text-indigo-600" />
                Trending Legal Authorities
              </h3>

              <div className="flex flex-wrap gap-2">
                {[
                  "CAMA 2020",
                  "Section 305 Duties",
                  "NICN Jurisprudence",
                  "NDPA 2023",
                  "Governor's Consent",
                  "Copyright Act 2022",
                  "Section 37 Privacy",
                  "Lagos Tenancy Law"
                ].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => {
                      setSearchQuery(tag);
                      fetchArticles();
                    }}
                    className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition-colors"
                  >
                    #{tag.replace(/\s+/g, "")}
                  </button>
                ))}
              </div>
            </div>

            {/* Rule 10 Compliance Notice */}
            <div className="bg-gradient-to-br from-stone-900 to-stone-800 text-stone-200 rounded-3xl p-6 shadow-md space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                <Scale size={15} /> Professional Ethics
              </div>
              <h4 className="text-sm font-black text-white">
                Rule 10 & 39 Compliance
              </h4>
              <p className="text-xs text-stone-300 leading-relaxed font-medium">
                Wigally publications are peer-reviewed educational insights in furtherance of professional continuing legal education (CLE) and client legal awareness, adhering strictly to the Rules of Professional Conduct in the Legal Profession 2023.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Publishing Modal */}
      <ArticleEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onPublished={handleArticlePublished}
        currentLawyer={
          isLawyer
            ? user
            : {
                lawyer_id: "lw_001",
                full_name: "Barr. Amaka Okonkwo",
                title: "Corporate & Employment Counsel",
                firm: "Okonkwo & Associates",
                is_san: false
              }
        }
      />

      {/* Share Modal */}
      <ShareModal
        article={activeShareArticle}
        isOpen={Boolean(activeShareArticle)}
        onClose={() => setActiveShareArticle(null)}
        onShareSuccess={handleShareSuccess}
      />
    </div>
  );
}
