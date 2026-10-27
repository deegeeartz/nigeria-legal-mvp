"use client";

import { useState } from "react";
import Image from "next/image";
import { X, Download } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { PWAInstallButton } from "./PWAInstallButton";

export function PWABanner() {
  const { isInstalled, isInstallable, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("wigally_pwa_banner_dismissed") === "true";
    }
    return false;
  });
  const [showIOSModal, setShowIOSModal] = useState(false);

  // Strict rule: Dynamically hide if already installed or running in standalone mode or dismissed
  if (isInstalled || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("wigally_pwa_banner_dismissed", "true");
    }
  };

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowIOSModal(true);
    }
  };

  return (
    <>
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-slate-900/95 text-white backdrop-blur-md px-4 py-3 border-b border-slate-800 shadow-xl animate-in slide-in-from-top duration-300">
        <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
          {/* Logo & Text */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center shrink-0 overflow-hidden shadow-inner relative">
              <Image
                src="/icon-192.png"
                alt="Wigally Logo"
                width={32}
                height={32}
                className="object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold tracking-tight text-white truncate">Wigally App</span>
                <span className="text-[10px] uppercase font-bold tracking-wide px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Offline
                </span>
              </div>
              <p className="text-xs text-slate-300 truncate">
                Instant legal advice &amp; verified lawyers
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3 py-1.5 rounded-full text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </button>
            <button
              onClick={handleDismiss}
              className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition"
              aria-label="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {showIOSModal && (
        <PWAInstallButton variant="modal-trigger-only" />
      )}
    </>
  );
}
