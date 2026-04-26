"use client";

import { useShare } from "@/components/share-provider";

export function ReferralRankShareButton({ rank }: { rank: number }) {
  const { openShareModal, shareProfile } = useShare();

  if (!shareProfile || rank <= 0) {
    return null;
  }

  return (
    <button
      type="button"
      className="button button--secondary button--small"
      onClick={() => {
        openShareModal({
          title: "Climbing the Referral Board!",
          message: `I'm now ranked #${rank} on the Emorya referral leaderboard. Join through my link and let's climb together.`,
          hashtags: ["Emorya", "Referral"],
          profileUrl: shareProfile.profileUrl,
          milestone: "referral_rank_climb",
        });
      }}
    >
      Share your referral rank
    </button>
  );
}
