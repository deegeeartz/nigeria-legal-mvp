"use client";

import { useState, useEffect } from "react";

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  const [isStandalone, setIsStandalone] = useState(() => {
    if (typeof window === "undefined") return false;
    const matchMediaStandalone = window.matchMedia("(display-mode: standalone)").matches;
    const navigatorStandalone = window.navigator.standalone === true;
    const isDocumentStandalone = typeof document !== "undefined" && document.referrer.includes("android-app://");
    return matchMediaStandalone || navigatorStandalone || isDocumentStandalone;
  });

  const [isInstalled, setIsInstalled] = useState(() => {
    if (typeof window === "undefined") return false;
    const matchMediaStandalone = window.matchMedia("(display-mode: standalone)").matches;
    const navigatorStandalone = window.navigator.standalone === true;
    const isDocumentStandalone = typeof document !== "undefined" && document.referrer.includes("android-app://");
    return matchMediaStandalone || navigatorStandalone || isDocumentStandalone;
  });

  const [isIOS] = useState(() => {
    if (typeof window === "undefined") return false;
    const ua = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(ua) && !window.MSStream;
  });

  useEffect(() => {
    // Media query listener to detect display-mode change in real time
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const handleDisplayModeChange = (e) => {
      if (e.matches) {
        setIsStandalone(true);
        setIsInstalled(true);
      }
    };

    // Listen to beforeinstallprompt event (Chromium, Edge, Android Chrome, Samsung Internet)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    // Listen to appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsStandalone(true);
      setDeferredPrompt(null);
    };

    try {
      mediaQuery.addEventListener("change", handleDisplayModeChange);
    } catch {
      mediaQuery.addListener(handleDisplayModeChange);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      try {
        mediaQuery.removeEventListener("change", handleDisplayModeChange);
      } catch {
        mediaQuery.removeListener(handleDisplayModeChange);
      }
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice && choice.outcome === "accepted") {
        setIsInstalled(true);
        setDeferredPrompt(null);
        return true;
      }
    } catch (err) {
      console.error("PWA install error:", err);
    }
    return false;
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled: isInstalled || isStandalone,
    isStandalone,
    isIOS,
    install,
  };
}
