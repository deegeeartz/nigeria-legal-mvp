"use client";

import { useState, useEffect } from "react";
import { WifiOff, CheckCircle2 } from "lucide-react";

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(() => (typeof window !== "undefined" && typeof navigator !== "undefined" ? navigator.onLine : true));
  const [showReconnected, setShowReconnected] = useState(false);
  const [hasEverBeenOffline, setHasEverBeenOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (hasEverBeenOffline) {
        setShowReconnected(true);
        const timer = setTimeout(() => {
          setShowReconnected(false);
        }, 3500);
        return () => clearTimeout(timer);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setHasEverBeenOffline(true);
      setShowReconnected(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [hasEverBeenOffline]);

  // Show reconnected toast
  if (showReconnected && isOnline) {
    return (
      <div className="fixed bottom-20 md:bottom-6 right-4 z-50 flex items-center gap-2.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xl shadow-emerald-950/20 animate-in fade-in slide-in-from-bottom duration-300">
        <CheckCircle2 className="w-4 h-4 text-emerald-200" />
        <span>Back Online &mdash; Legal updates synced</span>
      </div>
    );
  }

  // Show offline alert
  if (!isOnline) {
    return (
      <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 flex items-center gap-3 rounded-2xl bg-amber-500 text-slate-950 px-4 py-3 text-xs font-medium shadow-2xl border border-amber-400 animate-in fade-in slide-in-from-bottom duration-300">
        <div className="p-2 rounded-xl bg-amber-400 text-slate-900 shrink-0">
          <WifiOff className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-slate-950">You are currently offline</p>
          <p className="text-slate-900/90 text-[11px] leading-tight mt-0.5">
            Viewing cached legal Q&amp;A topics &amp; verified lawyer profiles.
          </p>
        </div>
        <span className="flex h-2 w-2 relative shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-950 opacity-50"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-950"></span>
        </span>
      </div>
    );
  }

  return null;
}
