"use client";

import { useState } from "react";
import { Download, Share2, PlusSquare, X, Check, Smartphone } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";

export function PWAInstallButton({ variant = "header" }) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [installing, setInstalling] = useState(false);

  // If already installed or running in standalone mode, DO NOT show install button
  if (isInstalled) {
    return null;
  }

  // Handle click based on platform
  const handleClick = async () => {
    if (isInstallable) {
      setInstalling(true);
      await install();
      setInstalling(false);
    } else if (isIOS) {
      setShowIOSModal(true);
    } else {
      // Ambient fallback instructions
      setShowIOSModal(true);
    }
  };

  const isHeader = variant === "header";

  return (
    <>
      <button
        onClick={handleClick}
        disabled={installing}
        title="Install Wigally as an app"
        className={`group relative flex items-center gap-2 rounded-full font-semibold transition-all active:scale-95 ${
          isHeader
            ? "bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 text-xs shadow-sm border border-slate-700/60"
            : "bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 text-sm shadow-md shadow-emerald-900/10"
        }`}
      >
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <Download className="w-3.5 h-3.5 text-amber-400 group-hover:translate-y-0.5 transition-transform" />
        <span>Install App</span>
      </button>

      {/* Guide Modal for iOS Safari / Browser when prompt needs manual trigger */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 relative dark:bg-slate-900 dark:border-slate-800">
            <button
              onClick={() => setShowIOSModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-amber-400 border border-slate-800 shadow-md">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Install Wigally App
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Runs instantly without App Store downloads
                </p>
              </div>
            </div>

            <div className="space-y-3.5 py-2 text-sm text-slate-700 dark:text-slate-300">
              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/50">
                <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shrink-0">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold text-slate-900 dark:text-white">1. Tap Share</span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Tap the <strong>Share</strong> icon in your browser toolbar (bottom on iOS Safari, or top on desktop/Android).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/50">
                <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <PlusSquare className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold text-slate-900 dark:text-white">2. Add to Home Screen</span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Scroll down and select <strong>&quot;Add to Home Screen&quot;</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/50">
                <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 shrink-0">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold text-slate-900 dark:text-white">3. Offline Ready</span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Access legal Q&amp;A topics and verified lawyer profiles anytime, even with low or no internet connection.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="mt-4 w-full rounded-xl bg-slate-900 dark:bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 dark:hover:bg-emerald-500 transition shadow-sm"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
