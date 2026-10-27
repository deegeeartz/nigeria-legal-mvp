"use client";

import { useEffect } from "react";
import { CaseChatWorkspace } from "./CaseChatWorkspace";

export function CaseChatModal({
  isOpen,
  onClose,
  initialConversationId = 1,
  currentUser,
  isLawyer = false,
}) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-5xl h-[88vh] max-h-[820px] flex flex-col shadow-2xl rounded-3xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <CaseChatWorkspace
          initialConversationId={initialConversationId}
          currentUser={currentUser}
          isLawyer={isLawyer}
          onClose={onClose}
          embedded={false}
        />
      </div>
    </div>
  );
}
