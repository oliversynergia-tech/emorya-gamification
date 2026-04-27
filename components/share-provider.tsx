"use client";

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";

import { ShareModal } from "@/components/share-modal";
import { useShareModal } from "@/hooks/use-share-modal";
import { getMilestoneQuestSlugForShare, type ShareData } from "@/lib/share-presets";

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
  initialShareData = null,
}: {
  children: ReactNode;
  shareProfile: ShareProfile | null;
  initialShareData?: ShareData | null;
}) {
  const modal = useShareModal();
  const initialPromptOpenedRef = useRef(false);
  const referralPromptEndpoint = "/api/referrals/share-prompt" as string;

  useEffect(() => {
    if (initialPromptOpenedRef.current || !initialShareData || modal.isOpen) {
      return;
    }

    initialPromptOpenedRef.current = true;
    modal.openShareModal(initialShareData);

    if (initialShareData.milestone === "referral_signup" && initialShareData.referralPromptId) {
      fetch(referralPromptEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          referralId: initialShareData.referralPromptId,
        }),
      }).catch(() => {
        // Ignore prompt-marking errors so the share prompt still opens.
      });
    }
  }, [initialShareData, modal]);

  async function handleShare(platform: string) {
    const questSlug = getMilestoneQuestSlugForShare(modal.shareData?.milestone);

    if (!questSlug || !modal.shareData) {
      return;
    }

    try {
      await fetch("/api/quests/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          questSlug,
          submissionData: {
            contentUrl: modal.shareData.profileUrl,
            platform,
            profileUrl: modal.shareData.profileUrl,
            sharedAt: new Date().toISOString(),
            note: `Shared via ${platform} from milestone prompt`,
          },
        }),
      });
    } catch {
      // Ignore share submission errors so the share action itself stays smooth.
    }
  }

  return (
    <ShareContext.Provider value={{ ...modal, shareProfile }}>
      {children}
      {modal.shareData ? (
        <ShareModal
          isOpen={modal.isOpen}
          onClose={modal.closeShareModal}
          shareData={modal.shareData}
          onShare={handleShare}
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
