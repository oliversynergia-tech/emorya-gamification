"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

import { ReferralWelcome } from "@/components/referral-welcome";

type ReferralWelcomeScreenProps = {
  sessionUserId: string;
  referrer: {
    displayName: string;
    level: number;
    totalXp: number;
    currentStreak: number;
    avatarUrl: string | null;
    referralCode: string;
    rank: number | null;
    questsCompleted: number;
    attributionSource?: string | null;
  };
};

function getSeenKey(userId: string) {
  return `emorya-referral-welcome-seen:${userId}`;
}

export function ReferralWelcomeScreen({ sessionUserId, referrer }: ReferralWelcomeScreenProps) {
  const router = useRouter();
  const seenKey = useMemo(() => getSeenKey(sessionUserId), [sessionUserId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (window.sessionStorage.getItem(seenKey) === "1") {
      router.replace("/dashboard#campaign-mission");
    }
  }, [router, seenKey]);

  return (
    <ReferralWelcome
      referrer={referrer}
      onContinue={() => {
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(seenKey, "1");
        }
        router.replace("/dashboard#campaign-mission");
      }}
    />
  );
}
