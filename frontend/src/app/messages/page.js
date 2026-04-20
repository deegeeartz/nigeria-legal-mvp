"use client";

import { useAuth } from "@/lib/auth";
import { useRealTime } from "@/lib/realtime";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Send, Clock } from "lucide-react";


export default function MessagesPage() {
  const { user, loading, authFetch } = useAuth();
  const { lastEvent } = useRealTime();
  const router = useRouter();

  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);

  // Live WebSocket listener
  useEffect(() => {
    if (lastEvent?.event === "new_message") {
      const { data } = lastEvent;
      if (data.conversation_id === selectedId) {
        setMessages((prev) => {
            // Avoid duplicates
            if (prev.some(m => m.message_id === data.message_id)) return prev;
            return [...prev, {
                id: data.message_id,
                message_id: data.message_id,
                conversation_id: data.conversation_id,
                sender_user_id: data.sender_user_id,
                body: data.body,
                created_on: data.created_on
            }];
        });
      }
    }
  }, [lastEvent, selectedId]);


  const [lawyerId, setLawyerId] = useState("");
  const [initialMessage, setInitialMessage] = useState("");
  const [messageDraft, setMessageDraft] = useState("");

  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }

    if (loading || !user) {
      return;
    }

    const loadConversations = async () => {
      setLoadingConversations(true);
      setErrorMessage("");
      try {
        const response = await authFetch("/api/conversations");
        if (!response.ok) {
          setErrorMessage("Could not load conversations.");
          return;
        }
        const payload = await response.json();
        setConversations(payload);
        if (payload.length > 0) {
          setSelectedId(payload[0].conversation_id);
        }
      } catch (error) {
        console.error(error);
        setErrorMessage("Could not load conversations.");
      } finally {
        setLoadingConversations(false);
      }
    };

    void loadConversations();
  }, [authFetch, loading, router, user]);

  useEffect(() => {
    const loadMessages = async () => {
      if (!selectedId) {
        setMessages([]);
        return;
      }

      setLoadingMessages(true);
      setErrorMessage("");
      try {
        const response = await authFetch(`/api/conversations/${selectedId}/messages`);
        if (!response.ok) {
          setErrorMessage("Could not load messages.");
          return;
        }
        setMessages(await response.json());
      } catch (error) {
        console.error(error);
        setErrorMessage("Could not load messages.");
      } finally {
        setLoadingMessages(false);
      }
    };

    void loadMessages();
  }, [authFetch, selectedId]);

  const selectedConversation = useMemo(
    () => conversations.find((item) => item.conversation_id === selectedId) || null,
    [conversations, selectedId],
  );

  const openConversation = async (event) => {
    event.preventDefault();
    if (user?.role !== "client") {
      return;
    }

    setSubmitting(true);
    setErrorMessage("");
    try {
      const response = await authFetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lawyer_id: lawyerId.trim(), initial_message: initialMessage.trim() }),
      });

      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        setErrorMessage(detail.detail || "Could not open conversation.");
        return;
      }

      const created = await response.json();
      setConversations((previous) => [created, ...previous]);
      setSelectedId(created.conversation_id);
      setLawyerId("");
      setInitialMessage("");
    } catch (error) {
      console.error(error);
      setErrorMessage("Could not open conversation.");
    } finally {
      setSubmitting(false);
    }
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!selectedId || !messageDraft.trim()) {
      return;
    }

    setSubmitting(true);
    setErrorMessage("");
    try {
      const response = await authFetch(`/api/conversations/${selectedId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: messageDraft.trim() }),
      });

      if (!response.ok) {
        setErrorMessage("Could not send message.");
        return;
      }

      const created = await response.json();
      setMessages((previous) => [...previous, created]);
      setMessageDraft("");
    } catch (error) {
      console.error(error);
      setErrorMessage("Could not send message.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex-1 flex justify-center items-center">
        <Loader2 className="animate-spin text-emerald-500 w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-50 p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-black text-slate-800 mb-2">Messages</h1>
        <p className="text-slate-500 mb-6">Manage your conversations with clients and lawyers.</p>

        {errorMessage && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</div>}

        {user.role === "client" && (
          <form onSubmit={openConversation} className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-3 bg-white border border-slate-100 p-4 rounded-2xl">
            <input
              value={lawyerId}
              onChange={(event) => setLawyerId(event.target.value)}
              placeholder="Lawyer ID (e.g. lw_004)"
              required
              className="md:col-span-1 px-3 py-3 border border-slate-200 rounded-xl"
            />
            <input
              value={initialMessage}
              onChange={(event) => setInitialMessage(event.target.value)}
              placeholder="Start a new conversation"
              required
              className="md:col-span-2 px-3 py-3 border border-slate-200 rounded-xl"
            />
            <button
              type="submit"
              disabled={submitting}
              className="md:col-span-1 px-4 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-500 disabled:opacity-70"
            >
              Open Chat
            </button>
          </form>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-100 rounded-2xl p-4">
            <h2 className="font-bold text-slate-800 mb-3">Conversations</h2>
            {loadingConversations ? (
              <div className="py-8 text-center"><Loader2 className="w-6 h-6 text-emerald-500 animate-spin mx-auto" /></div>
            ) : conversations.length === 0 ? (
              <p className="text-sm text-slate-500">No conversations yet.</p>
            ) : (
              <div className="space-y-2">
                {conversations.map((conversation) => (
                  <button
                    key={conversation.conversation_id}
                    onClick={() => setSelectedId(conversation.conversation_id)}
                    className={`w-full text-left px-3 py-3 rounded-xl border ${selectedId === conversation.conversation_id ? "border-emerald-300 bg-emerald-50" : "border-slate-100"}`}
                  >
                    <p className="font-semibold text-sm text-slate-800">Conversation #{conversation.conversation_id}</p>
                    <p className="text-xs text-slate-500 mt-1">Lawyer: {conversation.lawyer_id}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-4 lg:col-span-2">
            <h2 className="font-bold text-slate-800 mb-1">Thread</h2>
            {selectedConversation && <p className="text-xs text-slate-500 mb-3">Conversation #{selectedConversation.conversation_id}</p>}

            {loadingMessages ? (
              <div className="py-8 text-center"><Loader2 className="w-6 h-6 text-emerald-500 animate-spin mx-auto" /></div>
            ) : selectedId == null ? (
              <p className="text-sm text-slate-500">Select a conversation to view messages.</p>
            ) : (
              <>
                <div className="space-y-2 max-h-[420px] overflow-auto pr-1 mb-4">
                  {messages.length === 0 ? (
                    <p className="text-sm text-slate-500">No messages in this conversation yet.</p>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.message_id}
                        className={`rounded-xl px-3 py-2 text-sm border ${message.sender_user_id === user.user_id ? "bg-emerald-50 border-emerald-200" : "bg-white border-slate-200"}`}
                      >
                        <div className="flex justify-between items-center mb-1">
                            <p className="font-semibold text-slate-800">
                                {message.sender_user_id === user.user_id ? "You" : `User #${message.sender_user_id}`}
                            </p>
                            <p className="text-[10px] text-slate-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(message.created_on).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                        <p className="text-slate-700">{message.body}</p>
                      </div>

                    ))
                  )}
                </div>

                {selectedId != null && (
                  <form onSubmit={sendMessage} className="flex gap-2">
                    <input
                      value={messageDraft}
                      onChange={(event) => setMessageDraft(event.target.value)}
                      placeholder="Type a message"
                      className="flex-1 px-3 py-3 border border-slate-200 rounded-xl"
                      required
                    />
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-3 rounded-xl bg-slate-900 text-white font-semibold hover:bg-emerald-600 disabled:opacity-70 flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      Send
                    </button>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
