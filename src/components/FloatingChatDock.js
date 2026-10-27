"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import {
  MessageSquare,
  X,
  Minus,
  Send,
  ShieldCheck,
  Paperclip,
  CheckCheck,
  Maximize2,
  Lock,
  Scale
} from "lucide-react";
import Link from "next/link";

export function FloatingChatDock() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeConvId, setActiveConvId] = useState(1);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Default counsel info
  const counselInfo = {
    name: user?.role === "lawyer" ? "Tunde Bakare (Client)" : "Barr. Amaka Okonkwo",
    title: user?.role === "lawyer" ? "Lekki Commercial Lease Matter" : "NBA Verified Counsel • Lagos Bar",
    avatar: user?.role === "lawyer"
      ? ""
      : "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80",
    escrow: "₦45,000 Secured"
  };

  useEffect(() => {
    async function loadDockMessages() {
      try {
        const res = await fetch(`/api/conversations/${activeConvId}/messages`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setMessages(data);
            return;
          }
        }
      } catch (err) {
        console.warn("Using default dock messages", err);
      }
      setMessages([
        {
          id: 1,
          conversation_id: 1,
          sender_user_id: 1,
          body: "Hello Barrister Amaka, I uploaded the lease draft for your review.",
          created_on: "2026-07-30T14:25:00Z"
        },
        {
          id: 2,
          conversation_id: 1,
          sender_user_id: 2,
          body: "Thank you Tunde! I have received it and will look over it before our scheduled session.",
          created_on: "2026-07-30T14:30:00Z"
        }
      ]);
    }

    if (isOpen) {
      loadDockMessages();
    }
  }, [isOpen, activeConvId]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping, isOpen, isMinimized]);

  const handleSendMessage = async () => {
    const text = inputText.trim();
    if (!text) return;

    const currentSenderId = user?.role === "lawyer" ? 2 : 1;
    const tempMsg = {
      id: Date.now(),
      conversation_id: activeConvId,
      sender_user_id: currentSenderId,
      body: text,
      created_on: new Date().toISOString()
    };

    setMessages((prev) => [...prev, tempMsg]);
    setInputText("");

    try {
      await fetch(`/api/conversations/${activeConvId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text })
      });
    } catch (err) {
      console.error("Failed to post message", err);
    }

    // Interactive reply simulation
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const reply = user?.role === "lawyer"
        ? {
            id: Date.now() + 1,
            conversation_id: activeConvId,
            sender_user_id: 1,
            body: "Understood, Barrister. I'll have the revised addendum ready.",
            created_on: new Date().toISOString()
          }
        : {
            id: Date.now() + 1,
            conversation_id: activeConvId,
            sender_user_id: 2,
            body: "Noted. I am examining clause 4 regarding repair liabilities under Lagos Tenancy Law.",
            created_on: new Date().toISOString()
          };
      setMessages((prev) => [...prev, reply]);
    }, 1600);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // If user is not logged in, do not show floating dock
  if (!user) return null;

  return (
    <div className="fixed bottom-4 right-4 md:bottom-5 md:right-6 z-50 flex flex-col items-end">
      {/* Maximized Chat Popup Box */}
      {isOpen && !isMinimized && (
        <div className="w-[92vw] sm:w-[380px] h-[520px] max-h-[80vh] bg-white rounded-2xl shadow-2xl border border-stone-300 flex flex-col overflow-hidden mb-3 animate-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-stone-900 text-white px-4 py-3 flex items-center justify-between shrink-0 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                {counselInfo.avatar ? (
                  <img
                    src={counselInfo.avatar}
                    alt={counselInfo.name}
                    className="w-8 h-8 rounded-full object-cover border border-amber-400"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-stone-800 text-amber-400 font-bold flex items-center justify-center text-xs border border-stone-700">
                    {counselInfo.name.charAt(0)}
                  </div>
                )}
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-stone-900" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-black truncate font-serif text-amber-400">
                  {counselInfo.name}
                </h4>
                <p className="text-[10px] text-stone-300 truncate">
                  {counselInfo.title}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0 text-stone-300">
              <Link
                href="/dashboard"
                title="Open full Case Workspace"
                className="p-1 hover:text-white hover:bg-stone-800 rounded-md transition-colors"
              >
                <Maximize2 size={13} />
              </Link>
              <button
                type="button"
                onClick={() => setIsMinimized(true)}
                title="Minimize chat"
                className="p-1 hover:text-white hover:bg-stone-800 rounded-md transition-colors cursor-pointer"
              >
                <Minus size={14} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close chat"
                className="p-1 hover:text-white hover:bg-stone-800 rounded-md transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Privilege Ribbon */}
          <div className="bg-amber-50 px-3 py-1.5 border-b border-amber-200 text-[10px] text-amber-900 flex items-center justify-between shrink-0">
            <span className="flex items-center gap-1 font-semibold">
              <Lock size={10} className="text-amber-700" /> Rule 19 RPC Privileged
            </span>
            <span className="font-mono font-bold text-emerald-800 text-[9px]">
              {counselInfo.escrow}
            </span>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-stone-50/50">
            {messages.map((m) => {
              const isMe = user?.role === "lawyer" ? m.sender_user_id === 2 : m.sender_user_id === 1;
              return (
                <div
                  key={m.id || m.message_id}
                  className={`flex flex-col max-w-[85%] ${isMe ? "ml-auto items-end" : "mr-auto items-start"}`}
                >
                  <div
                    className={`px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                      isMe
                        ? "bg-stone-900 text-white rounded-br-xs"
                        : "bg-white border border-stone-200 text-stone-800 rounded-bl-xs shadow-2xs"
                    }`}
                  >
                    {m.body}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5 text-[9px] text-stone-400 font-mono">
                    <span>
                      {m.created_on
                        ? new Date(m.created_on).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : "Just now"}
                    </span>
                    {isMe && <CheckCheck size={10} className="text-amber-500" />}
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="flex items-center gap-1.5 text-stone-500 text-[11px] italic">
                <span className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce delay-100" />
                <span className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce delay-200" />
                <span className="text-[10px]">Counsel is typing...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Compact Input */}
          <div className="p-2.5 bg-white border-t border-stone-200 flex items-center gap-1.5 shrink-0">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type message to counsel..."
              className="flex-1 px-3 py-2 bg-stone-100 border border-stone-200 rounded-xl text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:bg-white focus:border-stone-400"
            />
            <button
              type="button"
              onClick={handleSendMessage}
              disabled={!inputText.trim()}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                inputText.trim()
                  ? "bg-stone-900 text-white hover:bg-stone-800 shadow-2xs"
                  : "bg-stone-200 text-stone-400 cursor-not-allowed"
              }`}
            >
              <Send size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Floating Trigger Button / Pill (Facebook Messenger Style) */}
      <button
        type="button"
        onClick={() => {
          if (isOpen && isMinimized) {
            setIsMinimized(false);
          } else {
            setIsOpen(!isOpen);
            setIsMinimized(false);
          }
        }}
        className="group flex items-center gap-2.5 px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-full shadow-xl border border-stone-700 transition-all hover:scale-105 active:scale-95 cursor-pointer"
      >
        <div className="relative">
          <MessageSquare size={18} className="text-amber-400" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-stone-900" />
        </div>
        <span className="text-xs font-bold font-serif hidden sm:inline">
          {isOpen && !isMinimized ? "Case Chat" : "Counsel Chat"}
        </span>
        <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded-full text-[10px] font-mono font-bold">
          2
        </span>
      </button>
    </div>
  );
}
