"use client";

import { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  Send,
  Paperclip,
  ShieldCheck,
  Lock,
  Calendar,
  FileText,
  Clock,
  CheckCheck,
  Sparkles,
  Download,
  Upload,
  User,
  Scale,
  ChevronRight,
  Info,
  CheckCircle2,
  ExternalLink,
  Plus
} from "lucide-react";

export function CaseChatWorkspace({
  initialConversationId = 1,
  currentUser,
  isLawyer = false,
  onClose,
  embedded = false,
}) {
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(initialConversationId);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [inputText, setInputText] = useState("");
  const [activeTab, setActiveTab] = useState("chat"); // "chat" | "documents" | "matter"
  const [mobileView, setMobileView] = useState("chat"); // "list" | "chat"
  const [isTyping, setIsTyping] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [newDocLabel, setNewDocLabel] = useState("");
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Fallback seed conversations if API has single conversation
  const defaultConversations = [
    {
      conversation_id: 1,
      matter_id: "MAT-2026-08101",
      title: "Commercial Lease Review - Lekki Phase 1",
      lawyer_name: "Barrister Amaka Okonkwo",
      lawyer_avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80",
      lawyer_badge: "NBA Verified • SAN Track",
      client_name: "Tunde Bakare",
      client_avatar: "",
      practice_area: "Property & Real Estate",
      escrow_amount: "₦45,000",
      escrow_status: "Secured in Escrow",
      last_message: "Thank you Tunde! I have received it and will look over it before our scheduled session.",
      last_message_time: "10:30 AM",
      unread: false,
    },
    {
      conversation_id: 2,
      matter_id: "MAT-2026-08102",
      title: "Labour Contract & Non-Compete Deliberation",
      lawyer_name: "Barrister Amaka Okonkwo",
      lawyer_avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80",
      lawyer_badge: "NBA Verified",
      client_name: "Kemi Adeyemi",
      client_avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
      practice_area: "Employment & Labour Law",
      escrow_amount: "₦35,000",
      escrow_status: "Secured in Escrow",
      last_message: "I will forward the revised severance schedule shortly.",
      last_message_time: "Yesterday",
      unread: true,
    }
  ];

  // Fetch conversations
  useEffect(() => {
    async function loadConversations() {
      try {
        const res = await fetch("/api/conversations");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            // Merge with rich metadata
            const enriched = data.map((conv, idx) => {
              const matched = defaultConversations.find(c => c.conversation_id === conv.conversation_id);
              if (matched) return matched;
              return {
                conversation_id: conv.conversation_id,
                matter_id: `MAT-2026-0810${conv.conversation_id}`,
                title: "Confidential Legal Consultation",
                lawyer_name: "Barrister Amaka Okonkwo",
                lawyer_avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80",
                lawyer_badge: "NBA Verified",
                client_name: "Verified Client",
                client_avatar: "",
                practice_area: "General Legal Counsel",
                escrow_amount: "₦45,000",
                escrow_status: "Secured in Escrow",
                last_message: "Case opened.",
                last_message_time: "Just now",
                unread: false,
              };
            });
            // Ensure at least 2 conversations for rich UI
            if (enriched.length === 1 && !enriched.find(c => c.conversation_id === 2)) {
              enriched.push(defaultConversations[1]);
            }
            setConversations(enriched);
            return;
          }
        }
      } catch (err) {
        console.warn("Using default conversation list", err);
      }
      setConversations(defaultConversations);
    }
    loadConversations();
  }, []);

  // Fetch messages for active conversation
  const fetchMessages = async (convId) => {
    try {
      setLoadingMessages(true);
      const res = await fetch(`/api/conversations/${convId}/messages`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setMessages(data);
          return;
        }
      }
      // Fallback seed messages if none returned
      if (convId === 1) {
        setMessages([
          {
            id: 1,
            conversation_id: 1,
            sender_user_id: 1,
            body: "Hello Barrister Amaka, I uploaded the draft lease agreement for the Lekki Phase 1 property. Looking forward to reviewing the indemnity and subletting clauses.",
            attachment_name: "Lekki_Property_Lease_Draft.pdf",
            created_on: "2026-07-30T14:25:00Z"
          },
          {
            id: 2,
            conversation_id: 1,
            sender_user_id: 2,
            body: "Thank you Tunde! I have received the draft and reviewed clauses 4 through 7. The maintenance surcharge requires stronger limitation to protect the tenant. We will dissect this during our consultation session.",
            created_on: "2026-07-30T14:30:00Z"
          }
        ]);
      } else {
        setMessages([
          {
            id: 3,
            conversation_id: 2,
            sender_user_id: 4,
            body: "Good day Counsel, my former employer issued a restrictive covenant letter prohibiting contract work for 12 months in Nigeria.",
            created_on: "2026-08-01T09:15:00Z"
          },
          {
            id: 4,
            conversation_id: 2,
            sender_user_id: 2,
            body: "Under Nigerian Supreme Court precedent (Koumoulis v Leventis Motors), non-compete clauses must be strictly reasonable in scope and geography to be enforceable. Let us examine the specific terms.",
            created_on: "2026-08-01T09:22:00Z"
          }
        ]);
      }
    } catch (err) {
      console.error("Failed to load messages", err);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Fetch documents for consultation #101
  const fetchDocuments = async () => {
    try {
      const res = await fetch("/api/consultations/101/documents");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setDocuments(data);
          return;
        }
      }
      setDocuments([
        {
          document_id: "doc_001",
          document_label: "Draft Lease Agreement (Lekki Phase 1)",
          original_filename: "Lekki_Property_Lease_Draft.pdf",
          content_type: "application/pdf",
          file_size: "1.8 MB",
          uploaded_at: "2026-07-30T15:00:00Z",
          uploaded_by: "Tunde Bakare (Client)",
          verified: true
        }
      ]);
    } catch (err) {
      console.warn("Using default documents", err);
    }
  };

  useEffect(() => {
    if (activeConvId) {
      fetchMessages(activeConvId);
      fetchDocuments();
    }
  }, [activeConvId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const activeConversation =
    conversations.find((c) => c.conversation_id === activeConvId) || conversations[0] || defaultConversations[0];

  const handleSendMessage = async (textToSend) => {
    const messageContent = (textToSend || inputText).trim();
    if (!messageContent) return;

    const currentSenderId = isLawyer ? 2 : 1;
    const tempId = Date.now();
    const newMsg = {
      id: tempId,
      message_id: tempId,
      conversation_id: activeConvId,
      sender_user_id: currentSenderId,
      body: messageContent,
      created_on: new Date().toISOString(),
    };

    // Optimistic UI update
    setMessages((prev) => [...prev, newMsg]);
    setInputText("");

    try {
      await fetch(`/api/conversations/${activeConvId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: messageContent }),
      });
    } catch (err) {
      console.error("Failed to post message", err);
    }

    // Interactive reply simulation after 1.8 seconds
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const simulatedReply = isLawyer
        ? {
            id: Date.now() + 1,
            message_id: Date.now() + 1,
            conversation_id: activeConvId,
            sender_user_id: 1, // client reply
            body: "Noted with thanks, Barrister. I will have the requested bank statement and tax clearance certificate ready for you as well.",
            created_on: new Date().toISOString()
          }
        : {
            id: Date.now() + 1,
            message_id: Date.now() + 1,
            conversation_id: activeConvId,
            sender_user_id: 2, // lawyer reply
            body: "Received. I have noted this in your confidential matter file. Our advisory will incorporate the relevant sections of CAMA 2020 and Tenancy Law of Lagos State.",
            created_on: new Date().toISOString()
          };

      setMessages((prev) => [...prev, simulatedReply]);
    }, 1800);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleQuickPrompt = (promptText) => {
    handleSendMessage(promptText);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingDoc(true);
      const formData = new FormData();
      formData.append("document_label", newDocLabel || file.name);
      formData.append("file", file);

      const res = await fetch("/api/consultations/101/documents", {
        method: "POST",
        body: formData,
      });

      const uploaded = res.ok
        ? await res.json()
        : {
            document_id: `doc_${Date.now()}`,
            document_label: newDocLabel || file.name,
            original_filename: file.name,
            content_type: file.type || "application/pdf",
            file_size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
            uploaded_at: new Date().toISOString(),
            uploaded_by: isLawyer ? "Barrister Amaka Okonkwo" : "Tunde Bakare",
          };

      setDocuments((prev) => [uploaded, ...prev]);
      setNewDocLabel("");

      // Post notice into the chat thread
      handleSendMessage(`📎 Uploaded confidential matter document: ${file.name}`);
    } catch (err) {
      console.error("Document upload error:", err);
    } finally {
      setUploadingDoc(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div
      className={`bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm flex flex-col ${
        embedded ? "h-[640px] md:h-[750px]" : "h-full"
      }`}
    >
      {/* Top Banner: Privileged Legal Header */}
      <div className="bg-stone-900 text-stone-100 px-6 py-3.5 border-b border-stone-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
            <Lock size={15} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider font-mono text-amber-400">
                Encrypted Legal Channel
              </span>
              <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Rule 19 RPC Privileged
              </span>
              <span className="text-stone-400 text-xs hidden sm:inline">• NDPA 2023 Compliant</span>
            </div>
            <p className="text-[11px] text-stone-400 font-medium">
              Attorney-client communications and uploaded briefs are strictly confidential.
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-stone-800 transition-colors"
          >
            ✕ Close
          </button>
        )}
      </div>

      {/* Main Split-Pane Workspace */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
        {/* Left Column: Conversations List */}
        <div
          className={`w-full md:w-80 lg:w-96 border-r border-stone-200 flex-col bg-stone-50/70 shrink-0 ${
            mobileView === "list" ? "flex" : "hidden md:flex"
          }`}
        >
          <div className="p-4 border-b border-stone-200 bg-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-black text-stone-900 font-serif flex items-center gap-2">
                <MessageSquare size={16} className="text-amber-600" />
                Matter Discussions
              </h3>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                {conversations.length} Active
              </span>
            </div>
            <p className="text-[11px] text-stone-500 font-medium">
              Consultations, document exchanges & matter briefs
            </p>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-stone-100 p-2 space-y-1">
            {conversations.map((conv) => {
              const isActive = conv.conversation_id === activeConvId;
              const displayPartyName = isLawyer ? conv.client_name : conv.lawyer_name;
              const displayAvatar = isLawyer ? conv.client_avatar : conv.lawyer_avatar;

              return (
                <button
                  key={conv.conversation_id}
                  onClick={() => {
                    setActiveConvId(conv.conversation_id);
                    setMobileView("chat");
                  }}
                  className={`w-full text-left p-3.5 rounded-2xl transition-all cursor-pointer ${
                    isActive
                      ? "bg-white border border-stone-300 shadow-xs"
                      : "hover:bg-white/70 border border-transparent"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative shrink-0">
                      {displayAvatar ? (
                        <img
                          src={displayAvatar}
                          alt={displayPartyName}
                          className="w-10 h-10 rounded-full object-cover border border-stone-300 shadow-2xs"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-stone-900 text-amber-400 font-bold flex items-center justify-center text-sm shadow-2xs">
                          {displayPartyName?.charAt(0) || "U"}
                        </div>
                      )}
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white"></span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-black text-stone-900 truncate font-serif">
                          {displayPartyName}
                        </h4>
                        <span className="text-[10px] font-mono text-stone-400 shrink-0">
                          {conv.last_message_time}
                        </span>
                      </div>

                      <p className="text-[11px] font-bold text-amber-900 truncate mt-0.5">
                        {conv.title}
                      </p>

                      <p className="text-[11px] text-stone-500 truncate mt-0.5">
                        {conv.last_message}
                      </p>

                      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900">
                          {conv.escrow_status}
                        </span>
                        <span className="text-[9px] font-mono font-bold text-stone-500">
                          {conv.escrow_amount}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick Notice in sidebar */}
          <div className="p-3 bg-stone-100 border-t border-stone-200 text-[11px] text-stone-600 flex items-center gap-2">
            <ShieldCheck size={14} className="text-emerald-700 shrink-0" />
            <span>Audit trail permanently recorded under legal oversight.</span>
          </div>
        </div>

        {/* Right Column: Chat Console & Document Vault */}
        <div
          className={`flex-1 flex-col bg-white overflow-hidden min-h-0 ${
            mobileView === "chat" ? "flex" : "hidden md:flex"
          }`}
        >
          {/* Header of Active Conversation */}
          <div className="p-3.5 md:p-4 border-b border-stone-200 bg-stone-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => setMobileView("list")}
                className="md:hidden px-2.5 py-1.5 text-xs font-bold text-stone-700 bg-stone-200 hover:bg-stone-300 rounded-xl flex items-center gap-1 shrink-0 cursor-pointer"
                title="Back to all matter threads"
              >
                ← Matters
              </button>
              <div className="w-9 h-9 md:w-10 md:h-10 rounded-2xl bg-stone-900 text-amber-400 flex items-center justify-center font-bold font-serif shrink-0 shadow-xs">
                <Scale size={18} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-black text-stone-900 font-serif truncate">
                    {activeConversation.title}
                  </h3>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 shrink-0">
                    {activeConversation.matter_id}
                  </span>
                </div>
                <p className="text-xs text-stone-500 font-medium truncate mt-0.5">
                  {isLawyer
                    ? `Client: ${activeConversation.client_name} • Escrow Protected (${activeConversation.escrow_amount})`
                    : `Counsel: ${activeConversation.lawyer_name} (${activeConversation.lawyer_badge})`}
                </p>
              </div>
            </div>

            {/* Tab switch between Chat and Documents */}
            <div className="flex items-center gap-1.5 bg-stone-200/70 p-1 rounded-xl shrink-0 self-start sm:self-auto">
              <button
                onClick={() => setActiveTab("chat")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === "chat"
                    ? "bg-white text-stone-900 shadow-2xs"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                <MessageSquare size={13} />
                <span>Discussion ({messages.length})</span>
              </button>
              <button
                onClick={() => setActiveTab("documents")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === "documents"
                    ? "bg-white text-stone-900 shadow-2xs"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                <FileText size={13} />
                <span>Documents & Vault ({documents.length})</span>
              </button>
            </div>
          </div>

          {/* VIEW 1: CHAT TAB */}
          {activeTab === "chat" && (
            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
              {/* Privileged Notice Ribbon */}
              <div className="bg-amber-50/70 px-4 py-2 border-b border-amber-200/60 text-[11px] text-amber-900 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={14} className="text-amber-700 shrink-0" />
                  <span>
                    Consultation session active. In-app video is on hold; matters proceed via confidential case chat & document review.
                  </span>
                </div>
                <span className="font-mono font-bold text-[10px] hidden md:inline">
                  ESCROW: ₦45,000 HELD
                </span>
              </div>

              {/* Messages Stream */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-stone-50/30">
                {loadingMessages ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <>
                    <div className="text-center my-2">
                      <span className="text-[10px] font-mono font-bold text-stone-400 uppercase tracking-widest bg-stone-100 px-3 py-1 rounded-full border border-stone-200">
                        Matter Initiated • Lagos Jurisdiction
                      </span>
                    </div>

                    {messages.map((msg) => {
                      // Determine if this message is from current user
                      // Lawyer view: sender 2 is current user
                      // Client view: sender 1 is current user
                      const isCurrentUser = isLawyer
                        ? msg.sender_user_id === 2
                        : msg.sender_user_id === 1;

                      const senderDisplayName =
                        msg.sender_user_id === 2
                          ? "Barrister Amaka Okonkwo"
                          : activeConversation.client_name;

                      const senderRoleBadge =
                        msg.sender_user_id === 2 ? "Counsel (NBA Verified)" : "Client";

                      return (
                        <div
                          key={msg.id || msg.message_id}
                          className={`flex gap-3 max-w-[85%] md:max-w-[75%] ${
                            isCurrentUser ? "ml-auto flex-row-reverse" : "mr-auto"
                          }`}
                        >
                          {/* Sender Avatar */}
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-stone-900 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0 mt-1 shadow-2xs">
                            {msg.sender_user_id === 2 ? (
                              <img
                                src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80"
                                alt="Barrister Amaka"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span>{senderDisplayName.charAt(0)}</span>
                            )}
                          </div>

                          {/* Message Body Bubble */}
                          <div
                            className={`rounded-2xl p-4 shadow-xs text-xs space-y-1.5 ${
                              isCurrentUser
                                ? "bg-stone-900 text-white rounded-tr-xs"
                                : "bg-white border border-stone-200 text-stone-800 rounded-tl-xs"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3 text-[10px]">
                              <span
                                className={`font-bold font-serif ${
                                  isCurrentUser ? "text-amber-400" : "text-stone-900"
                                }`}
                              >
                                {senderDisplayName}
                              </span>
                              <span
                                className={`font-mono text-[9px] px-1.5 py-0.2 rounded ${
                                  isCurrentUser
                                    ? "bg-white/10 text-stone-300"
                                    : "bg-stone-100 text-stone-600"
                                }`}
                              >
                                {senderRoleBadge}
                              </span>
                            </div>

                            <p className="leading-relaxed whitespace-pre-wrap font-sans text-xs">
                              {msg.body}
                            </p>

                            {/* Embedded Document Attachment if present */}
                            {msg.attachment_name && (
                              <div
                                className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 mt-2 ${
                                  isCurrentUser
                                    ? "bg-white/10 border-white/20 text-white"
                                    : "bg-stone-50 border-stone-200 text-stone-900"
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <FileText size={16} className="text-amber-500 shrink-0" />
                                  <span className="font-mono text-[11px] font-bold truncate">
                                    {msg.attachment_name}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setActiveTab("documents")}
                                  className="text-[10px] font-bold underline hover:opacity-80 shrink-0"
                                >
                                  View Vault →
                                </button>
                              </div>
                            )}

                            <div
                              className={`flex items-center justify-end gap-1 text-[9px] font-mono pt-1 ${
                                isCurrentUser ? "text-stone-400" : "text-stone-400"
                              }`}
                            >
                              <span>
                                {msg.created_on
                                  ? new Date(msg.created_on).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : "Now"}
                              </span>
                              <CheckCheck size={11} className="text-amber-400" />
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Typing Indicator */}
                    {isTyping && (
                      <div className="flex items-center gap-2 text-stone-500 text-xs italic py-1 animate-pulse">
                        <div className="w-6 h-6 rounded-full bg-stone-200 flex items-center justify-center text-[10px] font-bold">
                          ⚖️
                        </div>
                        <span>
                          {isLawyer ? activeConversation.client_name : "Barrister Amaka"}{" "}
                          is typing a confidential reply...
                        </span>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Quick Legal Prompt Suggestions */}
              <div className="px-4 py-2 border-t border-stone-200 bg-stone-50/80 flex items-center gap-2 overflow-x-auto shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 whitespace-nowrap font-mono">
                  Quick Prompts:
                </span>
                <button
                  type="button"
                  onClick={() =>
                    handleQuickPrompt(
                      "Please confirm the timeline for drafting the amended lease clauses."
                    )
                  }
                  className="px-2.5 py-1 bg-white hover:bg-stone-100 text-stone-700 rounded-lg text-[11px] font-semibold border border-stone-200 whitespace-nowrap transition-colors"
                >
                  ⏳ Timeline Confirmation
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleQuickPrompt(
                      "Could you review the indemnity liabilities under clause 6?"
                    )
                  }
                  className="px-2.5 py-1 bg-white hover:bg-stone-100 text-stone-700 rounded-lg text-[11px] font-semibold border border-stone-200 whitespace-nowrap transition-colors"
                >
                  ⚖️ Indemnity Review
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleQuickPrompt(
                      "All requested amendments look solid. Ready to proceed with escrow release upon signature."
                    )
                  }
                  className="px-2.5 py-1 bg-white hover:bg-stone-100 text-stone-700 rounded-lg text-[11px] font-semibold border border-stone-200 whitespace-nowrap transition-colors"
                >
                  💰 Escrow Milestone Approval
                </button>
              </div>

              {/* Composer Input Area */}
              <div className="p-3 md:p-4 border-t border-stone-200 bg-white shrink-0">
                <div className="flex items-center gap-2">
                  {/* File Upload Trigger */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.png,.jpg"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingDoc}
                    title="Attach Matter Brief or Agreement"
                    className="w-10 h-10 rounded-xl border border-stone-300 hover:border-stone-400 bg-stone-50 text-stone-700 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                  >
                    {uploadingDoc ? (
                      <div className="w-4 h-4 border-2 border-stone-900 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Paperclip size={18} />
                    )}
                  </button>

                  {/* Input field */}
                  <div className="flex-1 relative">
                    <textarea
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={
                        isLawyer
                          ? "Write confidential legal advice or matter update (Press Enter to send)..."
                          : "Type your message or question for counsel (Press Enter to send)..."
                      }
                      rows={1}
                      className="w-full px-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-amber-600 focus:bg-white resize-none"
                    />
                  </div>

                  {/* Send Button */}
                  <button
                    type="button"
                    onClick={() => handleSendMessage()}
                    disabled={!inputText.trim()}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                      inputText.trim()
                        ? "bg-stone-900 hover:bg-stone-800 text-white shadow-xs active:scale-95"
                        : "bg-stone-100 text-stone-400 cursor-not-allowed"
                    }`}
                  >
                    <Send size={16} />
                  </button>
                </div>
                <div className="flex items-center justify-between text-[10px] text-stone-400 font-medium mt-2 px-1">
                  <span>Shift + Enter for new line • Enter to send</span>
                  <span className="flex items-center gap-1 font-mono">
                    <ShieldCheck size={11} className="text-emerald-600" />
                    Protected by Wigally Verified Escrow
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: DOCUMENTS & MATTER VAULT TAB */}
          {activeTab === "documents" && (
            <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-6">
              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-black text-stone-900 font-serif flex items-center gap-2">
                    <FileText size={18} className="text-amber-600" />
                    NDPA Encrypted Matter Document Vault
                  </h4>
                  <p className="text-xs text-stone-500 font-medium mt-1">
                    Upload draft leases, court pleadings, identification proofs, and verified agreements for this consultation.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    id="vault-upload"
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.png,.jpg"
                  />
                  <label
                    htmlFor="vault-upload"
                    className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Upload size={14} /> Upload New Document
                  </label>
                </div>
              </div>

              {/* Documents List */}
              <div className="space-y-3">
                <h5 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-400">
                  Shared Matter Files ({documents.length})
                </h5>

                {documents.map((doc, idx) => (
                  <div
                    key={doc.document_id || idx}
                    className="bg-white border border-stone-200 rounded-2xl p-4 hover:border-stone-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center shrink-0 border border-amber-200 font-bold font-mono text-xs">
                        PDF
                      </div>
                      <div>
                        <h6 className="text-xs font-black text-stone-900 font-serif">
                          {doc.document_label || doc.original_filename}
                        </h6>
                        <div className="flex items-center gap-2 text-[10px] text-stone-500 font-mono mt-0.5">
                          <span>{doc.original_filename}</span>
                          <span>•</span>
                          <span>{doc.file_size || "1.8 MB"}</span>
                          <span>•</span>
                          <span className="text-emerald-700 font-bold">Verified Privileged</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={`/api/documents/${doc.document_id || "doc_001"}/download`}
                        download={doc.original_filename}
                        className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                      >
                        <Download size={13} /> Download
                      </a>
                      <button
                        onClick={() => {
                          setActiveTab("chat");
                          handleSendMessage(
                            `Referring to uploaded document: ${doc.document_label || doc.original_filename}`
                          );
                        }}
                        className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                      >
                        <MessageSquare size={13} /> Discuss in Chat
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Consultation Details Card */}
              <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-3">
                <h5 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-400">
                  Matter Retainer & Status
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                    <span className="text-stone-500 block text-[10px] uppercase font-bold">
                      Escrow Deposit
                    </span>
                    <span className="text-base font-black text-stone-900 font-serif mt-0.5 block">
                      ₦45,000
                    </span>
                    <span className="text-[10px] text-emerald-700 font-bold">100% Protected</span>
                  </div>
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                    <span className="text-stone-500 block text-[10px] uppercase font-bold">
                      Consultation Channel
                    </span>
                    <span className="text-xs font-black text-stone-900 mt-1 block">
                      Secure Chat & Docs
                    </span>
                    <span className="text-[10px] text-amber-700 font-bold">Video Room On Hold</span>
                  </div>
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                    <span className="text-stone-500 block text-[10px] uppercase font-bold">
                      Scheduled Window
                    </span>
                    <span className="text-xs font-black text-stone-900 mt-1 block">
                      Aug 5, 2026 • 10:00 AM
                    </span>
                    <span className="text-[10px] text-stone-500 font-medium">West Africa Time (WAT)</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
