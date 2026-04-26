"use client";

import { createContext, useContext, type ReactNode } from "react";

import { ShareModal } from "@/components/share-modal";
import { useShareModal } from "@/hooks/use-share-modal";
import type { ShareData } from "@/lib/share-presets";

type ShareProfile = {
  displayName: string;
  level: number;
  currentStreak: number;
  referralCode: string;
  profileUrl: string;
};

type ShareContextValue = ReturnType<typeof useShareModal> & {
  shareProfile: ShareProfile | null;
};

const ShareContext = createContext<ShareContextValue | null>(null);

export function ShareProvider({
  children,
  shareProfile,
}: {
  children: ReactNode;
  shareProfile: ShareProfile | null;
}) {
  const modal = useShareModal();

  return (
    <ShareContext.Provider value={{ ...modal, shareProfile }}>
      {children}
      {modal.shareData ? (
        <ShareModal
          isOpen={modal.isOpen}
          onClose={modal.closeShareModal}
          shareData={modal.shareData}
        />
      ) : null}
    </ShareContext.Provider>
  );
}

export function useShare() {
  const context = useContext(ShareContext);

  if (!context) {
    throw new Error("useShare must be used inside ShareProvider");
  }

  return context;
}
