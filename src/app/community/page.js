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
  ArrowRight,
  Share2,
  Bookmark,
  Globe,
  TrendingUp,
  Lock,
  Plus,
  Check
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

const SPOTLIGHT_STORIES = [
  {
    id: 1,
    title: "Lagos Rent Control AMA",
    author: "Barr. Amaka",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80",
    isLive: true,
  },
  {
    id: 2,
    title: "CAMA 2020 Filing",
    author: "Chidinma A.",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
    isLive: false,
  },
  {
    id: 3,
    title: "Supreme Court Verdict",
    author: "Ibrahim SAN",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80",
    isLive: false,
  },
  {
    id: 4,
    title: "Remote Worker NDPA",
    author: "Legal Pulse",
    avatar: "",
    isLive: false,
  },
  {
    id: 5,
    title: "Freelance Contracts",
    author: "Bar Council",
    avatar: "",
    isLive: false,
  }
];

const ACTIVE_LAWYERS = [
  {
    id: "lw_001",
    name: "Barr. Amaka Okonkwo",
    title: "Employment & Contracts",
    state: "Lagos Bar",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80",
  },
  {
    id: "lw_002",
    name: "Ibrahim Yusuf SAN",
    title: "Property & Commercial",
    state: "Abuja Bar",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80",
  },
  {
    id: "lw_003",
    name: "Chidinma Adeleke",
    title: "Fintech & CAC Filing",
    state: "Lagos Bar",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
  },
  {
    id: "lw_004",
    name: "Babatunde Fashola",
    title: "Land Title & Conveyance",
    state: "Ikeja Bar",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80",
  }
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
        {/* Intuitive Non-Member Notice Banner */}
        {!user && (
          <div className="editorial-card p-4 sm:p-5 rounded-2xl bg-amber-50/80 border border-amber-200 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-950 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-stone-900 text-amber-400 flex items-center justify-center font-bold shrink-0">
                <Scale size={16} />
              </div>
              <div>
                <span className="font-bold text-stone-900 text-xs sm:text-sm block">
                  Not a member yet? Join Nigeria’s verified legal network.
                </span>
                <span className="text-stone-600 text-[11px]">
                  Reading discussions is public. Create a free account in 30 seconds to write questions, vote in dilemma polls, or consult counsel.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/login"
                className="px-3.5 py-1.5 rounded-xl border border-stone-300 font-bold text-stone-800 hover:bg-white transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="px-4 py-1.5 rounded-xl bg-stone-900 text-white font-bold hover:bg-stone-800 transition-colors shadow-xs"
              >
                Join Free
              </Link>
            </div>
          </div>
        )}

        {/* Editorial Community Header */}
        <header className="editorial-card rounded-3xl p-6 sm:p-10 bg-white border border-stone-200 shadow-sm relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-stone-900 text-amber-400 flex items-center justify-center font-bold shadow-sm">
                <Scale size={22} />
              </div>
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-900">
                  Wigally Community Lounge • Text Deliberation Forum
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
            Write questions seeking legal clarity with complete anonymity or your public profile. Verified Barristers and Senior Advocates provide reasoned opinions and debate nuance in dedicated text discussion threads.
          </p>

          {/* Social Nav Tabs */}
          <div className="mt-8 pt-5 border-t border-stone-200 flex flex-wrap gap-2">
            {[
              { id: "feed", label: "💬 Lounge Discussions", count: communityData.questions?.length },
              { id: "amas", label: "📝 Counsel Text AMAs", badge: "Text Q&A" },
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
                  <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] bg-amber-600 text-white font-bold uppercase tracking-wider font-mono">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </header>

        {/* Tab 1: Counsel Text AMAs Tab */}
        {activeTab === "amas" && (
          <div className="space-y-6">
            <AmaBanner amas={communityData.amas} />
            <div className="p-6 rounded-2xl bg-white border border-stone-200 text-xs text-stone-600 leading-relaxed space-y-2">
              <p>
                <strong className="text-stone-900">What are Wigally Counsel Text AMAs?</strong> Verified Nigerian legal advocates hold structured asynchronous text discussion forums to break down complex legislation (CAMA 2020, Lagos Tenancy, Tax Reforms, NDPA). You can drop real-time questions directly into their desk queue anonymously for written responses.
              </p>
              <p className="text-amber-800 font-medium">
                Note: The Lounge is strictly a text-based chat discussion forum. Real-time audio rooms and voice conferencing are disabled.
              </p>
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

        {/* Tab 4: Discussions & Deliberation Feed (Modern Facebook 3-Column Layout) */}
        {activeTab === "feed" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column (3 cols): Profile & Shortcuts */}
            <aside className="lg:col-span-3 hidden lg:block sticky top-20 space-y-4">
              {/* User Profile Summary */}
              {user ? (
                <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs space-y-3">
                  <div className="flex items-center gap-3">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt=""
                        className="w-11 h-11 rounded-full object-cover border-2 border-stone-800 shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-stone-900 text-amber-400 font-bold flex items-center justify-center font-serif text-sm shrink-0">
                        {user.full_name?.charAt(0) || "U"}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4 className="text-sm font-black text-stone-900 truncate font-serif">
                        {user.full_name}
                      </h4>
                      <p className="text-[11px] text-stone-500 capitalize">
                        {user.role === "lawyer" ? "Verified Practitioner" : "Verified Member"}
                      </p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-600 font-mono">
                    <span>Deliberations: 12</span>
                    <span className="text-emerald-700 font-bold">100% Escrow Active</span>
                  </div>
                </div>
              ) : null}

              {/* Category Shortcuts Menu */}
              <div className="bg-white rounded-2xl p-3 border border-stone-200 shadow-xs space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-400 px-3 py-1 block">
                  Legal Channels
                </span>
                {CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? "bg-stone-900 text-white shadow-2xs"
                          : "text-stone-700 hover:bg-stone-100 hover:text-stone-900"
                      }`}
                    >
                      <span className="truncate">{cat}</span>
                      {cat === "All" && <span className="text-[10px] opacity-70 font-mono">({communityData.questions?.length})</span>}
                    </button>
                  );
                })}
              </div>

              {/* Consultation Quick Card */}
              <div className="bg-gradient-to-br from-amber-50 to-stone-100 rounded-2xl p-4 border border-amber-200/80 shadow-xs space-y-2">
                <span className="text-[10px] font-bold text-amber-900 uppercase font-mono tracking-wider flex items-center gap-1">
                  <ShieldCheck size={12} className="text-amber-700" /> Need Formal Counsel?
                </span>
                <p className="text-xs text-stone-700 font-medium leading-snug">
                  Get private legal representation, title searches, and contract reviews with Paystack Escrow.
                </p>
                <Link
                  href="/search"
                  className="inline-block mt-1 text-xs font-bold text-amber-900 hover:underline"
                >
                  Browse Verified Nigerian Lawyers →
                </Link>
              </div>
            </aside>

            {/* Center Column (6 cols): Stories, Composer, Questions Feed */}
            <div className="col-span-12 lg:col-span-6 space-y-4">
              {/* Facebook-style Stories / Legal Spotlights Rail */}
              <div className="bg-white rounded-2xl p-3.5 border border-stone-200 shadow-xs overflow-x-auto">
                <div className="flex items-center gap-3 min-w-max">
                  {SPOTLIGHT_STORIES.map((story) => (
                    <div
                      key={story.id}
                      onClick={() => alert(`Spotlight: ${story.title}. Explore related discussions in Legal Lounge.`)}
                      className="flex flex-col items-center gap-1.5 w-20 cursor-pointer group"
                    >
                      <div className="relative">
                        <div className="w-13 h-13 rounded-full p-0.5 bg-gradient-to-tr from-amber-500 via-amber-300 to-emerald-600 group-hover:scale-105 transition-transform shadow-2xs flex items-center justify-center">
                          {story.avatar ? (
                            <img
                              src={story.avatar}
                              alt=""
                              className="w-full h-full rounded-full object-cover border-2 border-white"
                            />
                          ) : (
                            <div className="w-full h-full rounded-full bg-stone-900 text-amber-400 font-bold flex items-center justify-center text-xs border-2 border-white">
                              ⚖️
                            </div>
                          )}
                        </div>
                        {story.isLive && (
                          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded-full bg-rose-600 text-white font-mono text-[8px] font-bold uppercase tracking-wider">
                            LIVE
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-stone-700 group-hover:text-amber-900 text-center truncate w-full">
                        {story.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Facebook-style "What's on your mind?" Composer Box */}
              <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-stone-900 text-amber-400 font-bold flex items-center justify-center text-sm shrink-0 font-serif shadow-2xs">
                    {user?.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt=""
                        className="w-full h-full rounded-full object-cover border border-stone-300"
                      />
                    ) : (
                      user?.full_name?.charAt(0) || "U"
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAskModal(true)}
                    className="flex-1 text-left px-4 py-2.5 rounded-full bg-stone-100 hover:bg-stone-200/80 text-stone-500 hover:text-stone-800 text-xs font-medium transition-colors cursor-pointer"
                  >
                    {user
                      ? `What legal dilemma is on your mind, ${user.full_name?.split(" ")[0]}?`
                      : "Ask a confidential question or legal inquiry..."}
                  </button>
                </div>

                <div className="pt-2 border-t border-stone-100 flex items-center justify-around gap-2 text-xs font-bold text-stone-600">
                  <button
                    type="button"
                    onClick={() => setShowAskModal(true)}
                    className="flex-1 py-1.5 rounded-xl hover:bg-stone-100 flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-amber-900"
                  >
                    <MessageSquare size={15} className="text-amber-600" />
                    <span>Ask Question</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("polls")}
                    className="flex-1 py-1.5 rounded-xl hover:bg-stone-100 flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-indigo-900"
                  >
                    <Vote size={15} className="text-indigo-600" />
                    <span>Dilemma Poll</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAnonymous(!isAnonymous)}
                    className="flex-1 py-1.5 rounded-xl hover:bg-stone-100 flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-stone-700"
                  >
                    <EyeOff size={15} className={isAnonymous ? "text-amber-700" : "text-stone-400"} />
                    <span>{isAnonymous ? "Anon: ON" : "Anon: OFF"}</span>
                  </button>
                </div>
              </div>

              {/* Search & Filter Bar */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Search discussions, CAMA clauses, tenancy..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-stone-200 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-400 shadow-2xs"
                  />
                </div>
                {selectedCategory !== "All" && (
                  <button
                    onClick={() => setSelectedCategory("All")}
                    className="px-3 py-2 rounded-xl bg-stone-200 text-stone-800 text-xs font-bold whitespace-nowrap hover:bg-stone-300 cursor-pointer"
                  >
                    Clear Filter ✕
                  </button>
                )}
              </div>

              {/* Questions Stream */}
              {loading ? (
                <div className="text-center py-12 text-stone-500 font-mono text-xs">
                  Loading community discussions...
                </div>
              ) : filteredQuestions.length === 0 ? (
                <div className="rounded-2xl p-8 text-center bg-white border border-stone-200 shadow-xs">
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
                      className="rounded-2xl bg-white border border-stone-200 overflow-hidden shadow-xs hover:border-stone-300 transition-all"
                    >
                      {/* Post Header: Facebook Style */}
                      <div className="p-5 pb-3">
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-stone-900 text-amber-400 font-bold flex items-center justify-center text-sm font-serif shadow-2xs shrink-0">
                              {q.is_anonymous ? "👤" : q.author_name?.charAt(0) || "U"}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-xs font-black text-stone-900 font-serif">
                                  {q.author_name}
                                </h3>
                                {q.is_anonymous ? (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-stone-100 text-stone-600">
                                    Anonymous
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-100 text-emerald-800">
                                    Verified
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] text-stone-400 font-mono mt-0.5">
                                <span>{q.created_at}</span>
                                <span>•</span>
                                <span className="text-amber-800 font-bold">{q.category}</span>
                                <span>•</span>
                                <span className="flex items-center gap-0.5">
                                  <Globe size={10} /> Public
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Title & Body */}
                        <h2 className="font-serif text-base sm:text-lg font-black text-stone-900 leading-snug">
                          {q.title}
                        </h2>
                        <p className="text-xs sm:text-sm text-stone-700 mt-2 leading-relaxed font-sans">
                          {q.body}
                        </p>

                        {/* Tags */}
                        {q.tags && q.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {q.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-[10px] font-mono font-bold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Reaction counts summary */}
                        <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500 font-medium">
                          <div className="flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[9px]">
                              👍
                            </span>
                            <span className="font-mono font-bold text-stone-700">
                              {q.upvotes || 0} Found Sound
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span>{q.answers?.length || 0} Counsel Opinions</span>
                            <span>2 Shares</span>
                          </div>
                        </div>

                        {/* Facebook 3-Button Interaction Bar */}
                        <div className="mt-2 pt-2 border-t border-stone-100 flex items-center justify-around gap-1">
                          <button
                            type="button"
                            onClick={(e) => handleUpvoteQuestion(q.id, e)}
                            className="flex-1 py-1.5 rounded-xl hover:bg-stone-100 text-stone-700 hover:text-stone-900 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <ThumbsUp size={15} />
                            <span>Sound</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setExpandedThreadId(isExpanded ? null : q.id)}
                            className={`flex-1 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                              isExpanded
                                ? "bg-stone-200 text-stone-900"
                                : "hover:bg-stone-100 text-stone-700 hover:text-stone-900"
                            }`}
                          >
                            <MessageSquare size={15} />
                            <span>Deliberate ({q.answers?.length || 0})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (navigator.clipboard) {
                                navigator.clipboard.writeText(window.location.href);
                                alert("Deliberation link copied to clipboard!");
                              }
                            }}
                            className="flex-1 py-1.5 rounded-xl hover:bg-stone-100 text-stone-700 hover:text-stone-900 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Share2 size={15} />
                            <span>Share</span>
                          </button>
                        </div>
                      </div>

                      {/* Answers & Deliberations Section (Expandable Comments Stream) */}
                      {isExpanded && (
                        <div className="bg-stone-50/70 p-5 border-t border-stone-200 space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                              <ShieldCheck size={14} className="text-emerald-700" />
                              <span>Verified Counsel Opinions ({q.answers?.length || 0})</span>
                            </h3>
                          </div>

                          {q.answers?.length === 0 ? (
                            <div className="p-3.5 rounded-xl bg-white border border-stone-200 text-xs text-stone-500 italic">
                              No counsel opinions yet. Verified lawyers are currently reviewing this thread.
                            </div>
                          ) : (
                            q.answers.map((ans) => (
                              <div
                                key={ans.id}
                                className="p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-2.5"
                              >
                                <div className="flex items-center justify-between gap-2 border-b border-stone-100 pb-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-full bg-amber-100 border border-amber-300 text-amber-900 flex items-center justify-center font-bold text-xs shrink-0">
                                      {ans.lawyer_name?.charAt(0) || "L"}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-bold text-xs text-stone-900 font-serif">
                                          {ans.lawyer_name}
                                        </span>
                                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-bold uppercase">
                                          NBA Verified
                                        </span>
                                      </div>
                                      <p className="text-[10px] text-stone-400 font-mono">
                                        {ans.lawyer_title} • {ans.nba_branch}
                                      </p>
                                    </div>
                                  </div>
                                  <Link
                                    href="/search"
                                    className="text-[11px] font-bold text-emerald-800 hover:underline flex items-center gap-1"
                                  >
                                    <span>Consult</span>
                                    <ArrowRight size={11} />
                                  </Link>
                                </div>

                                <div className="text-xs text-stone-800 leading-relaxed font-sans whitespace-pre-line">
                                  {ans.body}
                                </div>

                                {/* Peer Deliberations under Answer */}
                                {ans.deliberations && ans.deliberations.length > 0 && (
                                  <div className="mt-3 pt-2 border-t border-stone-100 space-y-2">
                                    <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1">
                                      <Flame size={12} className="text-amber-700" />
                                      <span>Peer Lawyer Deliberation</span>
                                    </div>
                                    {ans.deliberations.map((delib) => (
                                      <div
                                        key={delib.id}
                                        className="p-2.5 rounded-xl bg-amber-50/50 border border-amber-200/60 text-xs text-stone-700"
                                      >
                                        <div className="flex items-center gap-2 font-semibold text-stone-900 mb-0.5 text-[11px]">
                                          <span>{delib.lawyer_name}</span>
                                          <span className="text-[9px] text-stone-400 font-mono">
                                            • {delib.created_at}
                                          </span>
                                        </div>
                                        <p>{delib.comment}</p>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Add Peer Deliberation Input */}
                                <div className="mt-2.5 pt-2 flex gap-2">
                                  <input
                                    type="text"
                                    value={deliberationInput[ans.id] || ""}
                                    onChange={(e) =>
                                      setDeliberationInput((prev) => ({
                                        ...prev,
                                        [ans.id]: e.target.value
                                      }))
                                    }
                                    placeholder="Add peer legal deliberation..."
                                    className="flex-1 px-3 py-1.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-900 focus:outline-none focus:border-stone-400"
                                  />
                                  <button
                                    onClick={() => handleAddDeliberation(q.id, ans.id)}
                                    className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold shrink-0 cursor-pointer"
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

            {/* Right Column (3 cols): Active Lawyers Online, Trending Topics, Quick Take */}
            <aside className="lg:col-span-3 hidden lg:block sticky top-20 space-y-4">
              {/* Facebook-style "Contacts / Active Lawyers Online" */}
              <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-stone-900 font-serif flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Lawyers Online ({communityData.onlineLawyersCount || 19})
                  </h4>
                  <Link href="/search" className="text-[10px] font-bold text-amber-900 hover:underline">
                    View All
                  </Link>
                </div>

                <div className="space-y-2.5">
                  {ACTIVE_LAWYERS.map((lawyer) => (
                    <div
                      key={lawyer.id}
                      className="flex items-center justify-between gap-2 p-1.5 rounded-xl hover:bg-stone-50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative shrink-0">
                          <img
                            src={lawyer.avatar}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover border border-stone-300"
                          />
                          <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border border-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-stone-900 truncate font-serif">
                            {lawyer.name}
                          </p>
                          <p className="text-[10px] text-stone-400 truncate font-mono">
                            {lawyer.title}
                          </p>
                        </div>
                      </div>

                      <Link
                        href={`/book/${lawyer.id}`}
                        className="px-2 py-1 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-[10px] font-bold shrink-0 transition-colors"
                      >
                        Consult
                      </Link>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trending Topics in Nigeria */}
              <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs space-y-2.5">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-400 block">
                  Trending Legal Topics
                </span>
                <div className="space-y-2 text-xs">
                  <div className="cursor-pointer hover:text-amber-900">
                    <p className="font-bold text-stone-800">#LekkiTenancyEdict</p>
                    <p className="text-[10px] text-stone-400 font-mono">142 ongoing deliberations</p>
                  </div>
                  <div className="cursor-pointer hover:text-amber-900">
                    <p className="font-bold text-stone-800">#CACAnnualReturns</p>
                    <p className="text-[10px] text-stone-400 font-mono">98 inquiries</p>
                  </div>
                  <div className="cursor-pointer hover:text-amber-900">
                    <p className="font-bold text-stone-800">#SupremeCourtLandVerdict</p>
                    <p className="text-[10px] text-stone-400 font-mono">84 analyses</p>
                  </div>
                </div>
              </div>

              {/* Daily Quick Take Widget */}
              <DailyQuickTake quickTakes={communityData.quickTakes} />
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
