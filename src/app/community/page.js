"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  MessageSquare,
  Sparkles,
  Send,
  EyeOff,
  User,
  ShieldCheck,
  Award,
  Vote,
  Radio,
  BookOpen,
  Filter,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Scale,
  Search,
  MessageCircle,
  ThumbsUp,
  Flame,
  ArrowRight
} from "lucide-react";
import { DailyQuickTake } from "@/components/community/DailyQuickTake";
import { CommunityPoll } from "@/components/community/CommunityPoll";
import { AmaBanner } from "@/components/community/AmaBanner";
import { PlaybookLibrary } from "@/components/community/PlaybookLibrary";
import { ReactionBadges } from "@/components/community/ReactionBadges";
import { useAuth } from "@/lib/auth";

const PSEUDONYMS = [
  "Curious Tenant in Ikeja",
  "Bootstrapped Founder",
  "Freelance Designer",
  "Remote Software Engineer",
  "E-Commerce Seller",
  "Concerned Employee",
  "First-time Property Buyer"
];

const CATEGORIES = [
  "All",
  "Tenancy & Property",
  "Startups & CAC",
  "Employment & Labour",
  "Contracts & Freelance",
  "Constitutional & Civil Rights",
  "Data Privacy & NDPA"
];

export default function CommunityLoungePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("feed"); // "feed" | "amas" | "polls" | "playbooks"
  const [communityData, setCommunityData] = useState({
    questions: [],
    polls: [],
    amas: [],
    quickTakes: [],
    playbooks: [],
    reactions: {},
    onlineLawyersCount: 19
  });
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedThreadId, setExpandedThreadId] = useState(null);

  // New Question Form state
  const [showAskModal, setShowAskModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newCategory, setNewCategory] = useState("Tenancy & Property");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [selectedPseudonym, setSelectedPseudonym] = useState(PSEUDONYMS[0]);
  const [tagsInput, setTagsInput] = useState("");
  const [isSubmittingQuestion, setIsSubmittingQuestion] = useState(false);

  // Lawyer Deliberation inline state
  const [deliberationInput, setDeliberationInput] = useState({});

  const loadCommunity = async () => {
    try {
      const res = await fetch("/api/community");
      if (res.ok) {
        const data = await res.json();
        setCommunityData(data);
        if (data.questions && data.questions.length > 0 && !expandedThreadId) {
          setExpandedThreadId(data.questions[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load community:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCommunity();
  }, []);

  // Filtered questions
  const filteredQuestions = (communityData.questions || []).filter((q) => {
    const matchesCategory =
      selectedCategory === "All" ||
      q.category.toLowerCase().includes(selectedCategory.toLowerCase()) ||
      selectedCategory.toLowerCase().includes(q.category.toLowerCase());

    const matchesSearch =
      !searchQuery.trim() ||
      q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.body.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.tags && q.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));

    return matchesCategory && matchesSearch;
  });

  const handleAskSubmit = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newBody.trim() || isSubmittingQuestion) return;
    setIsSubmittingQuestion(true);

    try {
      const res = await fetch("/api/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ask_question",
          title: newTitle.trim(),
          text: newBody.trim(),
          category: newCategory,
          is_anonymous: isAnonymous,
          pseudonym: selectedPseudonym,
          author_name: user?.full_name || (isAnonymous ? selectedPseudonym : "Community Member"),
          tags: tagsInput
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.question) {
          setCommunityData((prev) => ({
            ...prev,
            questions: [data.question, ...(prev.questions || [])]
          }));
          setExpandedThreadId(data.question.id);
        }
        setShowAskModal(false);
        setNewTitle("");
        setNewBody("");
        setTagsInput("");
      }
    } catch (err) {
      console.error("Ask question error:", err);
    } finally {
      setIsSubmittingQuestion(false);
    }
  };

  const handleUpvoteQuestion = async (qId, e) => {
    e.stopPropagation();
    try {
      const res = await fetch("/api/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upvote_question",
          question_id: qId
        })
      });
      if (res.ok) {
        const data = await res.json();
        setCommunityData((prev) => ({
          ...prev,
          questions: prev.questions.map((q) =>
            q.id === qId ? { ...q, upvotes: data.upvotes } : q
          )
        }));
      }
    } catch (err) {
      console.error("Upvote error:", err);
    }
  };

  const handleAddDeliberation = async (qId, answerId) => {
    const text = deliberationInput[answerId];
    if (!text || !text.trim()) return;

    try {
      const res = await fetch("/api/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_deliberation",
          question_id: qId,
          answer_id: answerId,
          comment: text.trim(),
          lawyer_name: user?.role === "lawyer" ? user.full_name : "Barr. Peer Reviewer",
          is_san: false,
          nba_branch: "Lagos Branch"
        })
      });

      if (res.ok) {
        const data = await res.json();
        setCommunityData((prev) => ({
          ...prev,
          questions: prev.questions.map((q) => (q.id === qId ? data.question : q))
        }));
        setDeliberationInput((prev) => ({ ...prev, [answerId]: "" }));
      }
    } catch (err) {
      console.error("Deliberation error:", err);
    }
  };

  return (
    <div className="min-h-screen warm-parchment-pattern py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Editorial Community Header */}
        <header className="editorial-card rounded-3xl p-6 sm:p-10 bg-white border border-stone-200 shadow-sm relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-stone-900 text-amber-400 flex items-center justify-center font-bold shadow-sm">
                <Scale size={22} />
              </div>
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-900">
                  Wigally Community Lounge
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
                  <span className="text-xs font-semibold text-emerald-800">
                    {communityData.onlineLawyersCount || 19} Verified Nigerian Lawyers Active Now
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAskModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all hover:scale-[1.02]"
              >
                <Sparkles size={16} className="text-amber-400" />
                <span>Ask The Lounge</span>
              </button>
            </div>
          </div>

          <h1 className="font-editorial text-3xl sm:text-5xl font-bold text-stone-900 tracking-tight leading-tight max-w-3xl">
            Where Nigeria Deliberates Real Legal Questions.
          </h1>
          <p className="text-stone-600 text-sm sm:text-base mt-3 max-w-2xl leading-relaxed">
            Write questions seeking legal clarity with complete anonymity or your public profile. Verified Barristers and Senior Advocates provide reasoned opinions and debate nuance.
          </p>

          {/* Social Nav Tabs */}
          <div className="mt-8 pt-5 border-t border-stone-200 flex flex-wrap gap-2">
            {[
              { id: "feed", label: "💬 Lounge Discussions", count: communityData.questions?.length },
              { id: "amas", label: "🎙️ Live Legal AMAs", badge: "Live" },
              { id: "polls", label: "🗳️ Dilemma Polls", count: communityData.polls?.length },
              { id: "playbooks", label: "📖 Survival Playbooks", count: communityData.playbooks?.length }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === tab.id
                    ? "bg-stone-900 text-white shadow-xs"
                    : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className="ml-1.5 opacity-60 font-mono text-xs">({tab.count})</span>
                )}
                {tab.badge && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] bg-rose-500 text-white font-bold uppercase tracking-wider animate-pulse">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </header>

        {/* Tab 1: Live AMAs Tab */}
        {activeTab === "amas" && (
          <div className="space-y-6">
            <AmaBanner amas={communityData.amas} />
            <div className="p-6 rounded-2xl bg-white border border-stone-200 text-xs text-stone-600 leading-relaxed">
              <strong className="text-stone-900">What are Wigally Legal AMAs?</strong> Verified Nigerian legal advocates hold regular audio lounges to break down complex legislation (CAMA 2020, Lagos Tenancy, Tax Reforms, NDPA). You can drop real-time questions directly into their desk queue anonymously.
            </div>
          </div>
        )}

        {/* Tab 2: Community Polls Tab */}
        {activeTab === "polls" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {communityData.polls?.map((poll) => (
                <CommunityPoll
                  key={poll.id}
                  initialPoll={poll}
                  onVoteSuccess={(updated) => {
                    setCommunityData((prev) => ({
                      ...prev,
                      polls: prev.polls.map((p) => (p.id === updated.id ? updated : p))
                    }));
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Legal Playbooks Tab */}
        {activeTab === "playbooks" && (
          <div className="space-y-6">
            <PlaybookLibrary playbooks={communityData.playbooks} />
          </div>
        )}

        {/* Tab 4: Discussions & Deliberation Feed (Default) */}
        {activeTab === "feed" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Main Feed Column */}
            <div className="lg:col-span-8 space-y-6">
              {/* Category Pills & Search */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                        selectedCategory === cat
                          ? "bg-amber-800 text-white shadow-xs"
                          : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-100"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="relative shrink-0 w-full sm:w-56">
                  <Search size={14} className="absolute left-3 top-3 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Search discussions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-white border border-stone-200 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-400"
                  />
                </div>
              </div>

              {/* Questions Stream */}
              {loading ? (
                <div className="text-center py-12 text-stone-500 font-mono text-xs">
                  Loading community discussions...
                </div>
              ) : filteredQuestions.length === 0 ? (
                <div className="editorial-card rounded-2xl p-8 text-center bg-white border border-stone-200">
                  <p className="text-stone-600 text-sm">No discussions match your filter.</p>
                  <button
                    onClick={() => {
                      setSelectedCategory("All");
                      setSearchQuery("");
                    }}
                    className="mt-3 text-xs font-semibold text-amber-800 hover:underline"
                  >
                    Reset filters
                  </button>
                </div>
              ) : (
                filteredQuestions.map((q) => {
                  const isExpanded = expandedThreadId === q.id;
                  const reactions = communityData.reactions?.[q.id] || { sound: 0, lifesaver: 0, clarify: 0, debate: 0 };

                  return (
                    <article
                      key={q.id}
                      className="editorial-card rounded-2xl bg-white border border-stone-200 overflow-hidden shadow-sm"
                    >
                      <div className="p-6">
                        {/* Meta top bar */}
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold uppercase tracking-wider text-stone-700 bg-stone-100 px-2 py-0.5 rounded">
                              {q.category}
                            </span>
                            <span className="text-xs text-stone-400">•</span>
                            <span className="text-xs font-medium text-stone-500">
                              {q.is_anonymous ? (
                                <span className="inline-flex items-center gap-1 text-stone-600">
                                  <EyeOff size={12} /> {q.author_name}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-stone-800 font-semibold">
                                  <User size={12} /> {q.author_name}
                                </span>
                              )}
                            </span>
                          </div>

                          <span className="text-xs text-stone-400 font-mono">{q.created_at}</span>
                        </div>

                        {/* Title & Body */}
                        <h2 className="font-editorial text-xl sm:text-2xl font-bold text-stone-900 leading-snug">
                          {q.title}
                        </h2>
                        <p className="text-sm text-stone-700 mt-2.5 leading-relaxed font-sans">
                          {q.body}
                        </p>

                        {/* Tags */}
                        {q.tags && q.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-4">
                            {q.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-[11px] font-mono text-stone-600 bg-stone-100 px-2 py-0.5 rounded"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Social Reactions Bar */}
                        <div className="mt-5 pt-4 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3">
                          <ReactionBadges
                            questionId={q.id}
                            initialReactions={reactions}
                          />

                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => handleUpvoteQuestion(q.id, e)}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-stone-200 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition-colors"
                            >
                              <ThumbsUp size={13} />
                              <span className="font-mono">{q.upvotes || 0}</span>
                            </button>

                            <button
                              onClick={() => setExpandedThreadId(isExpanded ? null : q.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-stone-900 text-white text-xs font-semibold transition-colors hover:bg-stone-800"
                            >
                              <MessageSquare size={13} />
                              <span>{q.answers?.length || 0} Opinions</span>
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Answers & Deliberations Section */}
                      {isExpanded && (
                        <div className="bg-stone-50/80 p-6 border-t border-stone-200 space-y-5">
                          <div className="flex items-center justify-between">
                            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                              <ShieldCheck size={14} className="text-emerald-700" />
                              <span>Verified Counsel Opinions ({q.answers?.length || 0})</span>
                            </h3>
                          </div>

                          {q.answers?.length === 0 ? (
                            <div className="p-4 rounded-xl bg-white border border-stone-200 text-xs text-stone-500 italic">
                              No counsel opinions yet. Verified lawyers are currently reviewing this thread.
                            </div>
                          ) : (
                            q.answers.map((ans) => (
                              <div
                                key={ans.id}
                                className="p-5 rounded-2xl bg-white border border-stone-200/90 shadow-xs space-y-3"
                              >
                                {/* Lawyer Header */}
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-300 text-amber-900 flex items-center justify-center font-bold text-xs shrink-0">
                                      {ans.lawyer_name?.charAt(0) || "L"}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-bold text-xs sm:text-sm text-stone-900">
                                          {ans.lawyer_name}
                                        </span>
                                        {ans.is_san ? (
                                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 font-bold uppercase">
                                            SAN
                                          </span>
                                        ) : (
                                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold uppercase">
                                            NBA Verified
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[11px] text-stone-500">
                                        {ans.lawyer_title} • {ans.nba_branch}
                                      </p>
                                    </div>
                                  </div>

                                  <Link
                                    href="/search"
                                    className="text-xs font-semibold text-emerald-800 hover:text-emerald-900 hover:underline inline-flex items-center gap-1"
                                  >
                                    <span>Consult Counsel</span>
                                    <ArrowRight size={12} />
                                  </Link>
                                </div>

                                {/* Body */}
                                <div className="text-xs sm:text-sm text-stone-800 leading-relaxed font-sans whitespace-pre-line">
                                  {ans.body}
                                </div>

                                {/* Peer Deliberations under Answer */}
                                {ans.deliberations && ans.deliberations.length > 0 && (
                                  <div className="mt-4 pt-3 border-t border-stone-100 space-y-2.5">
                                    <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1">
                                      <Flame size={12} className="text-amber-700" />
                                      <span>Peer Lawyer Deliberation & Nuance</span>
                                    </div>

                                    {ans.deliberations.map((delib) => (
                                      <div
                                        key={delib.id}
                                        className="p-3 rounded-xl bg-amber-50/40 border border-amber-200/60 text-xs text-stone-700 leading-relaxed"
                                      >
                                        <div className="flex items-center gap-2 font-semibold text-stone-900 mb-1">
                                          <span>{delib.lawyer_name}</span>
                                          <span className="text-[10px] text-stone-500 font-mono">
                                            • {delib.created_at}
                                          </span>
                                        </div>
                                        <p>{delib.comment}</p>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Add Peer Deliberation Input */}
                                <div className="mt-3 pt-2 flex gap-2">
                                  <input
                                    type="text"
                                    value={deliberationInput[ans.id] || ""}
                                    onChange={(e) =>
                                      setDeliberationInput((prev) => ({
                                        ...prev,
                                        [ans.id]: e.target.value
                                      }))
                                    }
                                    placeholder="Add peer legal deliberation or cite contrary case law..."
                                    className="flex-1 px-3 py-1.5 rounded-lg bg-stone-50 border border-stone-200 text-xs text-stone-900 focus:outline-none focus:border-amber-400"
                                  />
                                  <button
                                    onClick={() => handleAddDeliberation(q.id, ans.id)}
                                    className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shrink-0"
                                  >
                                    Reply
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </article>
                  );
                })
              )}
            </div>

            {/* Sidebar Column: Daily Quick Take & Active Poll */}
            <aside className="lg:col-span-4 space-y-6">
              <DailyQuickTake quickTakes={communityData.quickTakes} />

              {communityData.polls?.[0] && (
                <CommunityPoll
                  initialPoll={communityData.polls[0]}
                  onVoteSuccess={(updated) => {
                    setCommunityData((prev) => ({
                      ...prev,
                      polls: prev.polls.map((p) => (p.id === updated.id ? updated : p))
                    }));
                  }}
                />
              )}

              {/* Community Guidelines Card */}
              <div className="editorial-card rounded-2xl p-6 bg-white border border-stone-200 shadow-sm text-xs text-stone-600 space-y-3">
                <h4 className="font-editorial text-base font-bold text-stone-900">
                  Lounge Etiquette
                </h4>
                <p>
                  1. <strong>Anonymous by Default:</strong> Feel free to disclose situation specifics without revealing your employer, landlord, or identity.
                </p>
                <p>
                  2. <strong>Opinions vs Retainers:</strong> Answers provided in the lounge constitute professional legal opinions and orientation, not formal retainers.
                </p>
                <p>
                  3. <strong>Verified Counsel Only:</strong> Only NBA-verified practitioners can post top-level legal opinions.
                </p>
              </div>
            </aside>
          </div>
        )}
      </div>

      {/* Ask Question Modal */}
      <AnimatePresence>
        {showAskModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="editorial-card rounded-3xl p-6 sm:p-8 bg-white max-w-xl w-full border border-stone-300 shadow-2xl relative"
            >
              <div className="flex items-center justify-between pb-4 border-b border-stone-200">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-stone-900 text-amber-400 flex items-center justify-center font-bold">
                    <MessageSquare size={16} />
                  </div>
                  <h3 className="font-editorial text-xl font-bold text-stone-900">
                    Write to the Legal Lounge
                  </h3>
                </div>
                <button
                  onClick={() => setShowAskModal(false)}
                  className="text-stone-400 hover:text-stone-700 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAskSubmit} className="mt-5 space-y-4">
                {/* Privacy Toggle */}
                <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <EyeOff size={16} className={isAnonymous ? "text-amber-800" : "text-stone-400"} />
                    <div>
                      <span className="text-xs font-bold text-stone-900 block">
                        Anonymous Posting
                      </span>
                      <span className="text-[11px] text-stone-500">
                        {isAnonymous ? "Post under a community pseudonym" : "Post with your account profile"}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAnonymous(!isAnonymous)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      isAnonymous
                        ? "bg-amber-800 text-white"
                        : "bg-stone-200 text-stone-700"
                    }`}
                  >
                    {isAnonymous ? "Anonymous ON" : "Public ON"}
                  </button>
                </div>

                {isAnonymous && (
                  <div>
                    <label className="text-xs font-bold text-stone-700 block mb-1">
                      Choose Your Persona Pseudonym:
                    </label>
                    <select
                      value={selectedPseudonym}
                      onChange={(e) => setSelectedPseudonym(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-stone-200 text-xs text-stone-900 focus:outline-none focus:border-stone-400"
                    >
                      {PSEUDONYMS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Question Headline:
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Can my landlord increase rent by 120% without 6-month notice?"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-stone-200 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-400"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-stone-700 block mb-1">
                      Category:
                    </label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-stone-200 text-xs text-stone-900 focus:outline-none focus:border-stone-400"
                    >
                      {CATEGORIES.filter((c) => c !== "All").map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-stone-700 block mb-1">
                      Tags (comma separated):
                    </label>
                    <input
                      type="text"
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      placeholder="LagosTenancy, RentHike"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-stone-200 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Details & Situation Context:
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={newBody}
                    onChange={(e) => setNewBody(e.target.value)}
                    placeholder="Provide the facts: contract clauses, timeline, and what remedies you are seeking..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-stone-200 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-400 leading-relaxed"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAskModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingQuestion}
                    className="px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm"
                  >
                    <Send size={13} />
                    <span>{isSubmittingQuestion ? "Publishing..." : "Publish to Lounge"}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
