"use client";

import { useState } from "react";

import { useShare } from "@/components/share-provider";

export function PublicProfileShareButton({ profileUrl }: { profileUrl: string }) {
  const [status, setStatus] = useState<string | null>(null);
  const { openShareModal, shareProfile } = useShare();

  async function copyProfileLink() {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setStatus("Copied!");
    } catch {
      setStatus("Copy failed. Select the link and copy it manually.");
    }
  }

  return (
    <div className="profile-share">
      <div className="profile-share__actions">
        <button type="button" className="button button--secondary" onClick={copyProfileLink}>
          Copy Link
        </button>
        <button
          type="button"
          className="button button--primary"
          onClick={() => {
            if (!shareProfile) {
              return;
            }

            openShareModal({
              title: "Check out my Emorya profile",
              message: `I'm Level ${shareProfile.level} with a ${shareProfile.currentStreak}-day streak on Emorya. Come join me.`,
              hashtags: ["Emorya"],
              profileUrl: shareProfile.profileUrl,
              milestone: "generic",
            });
          }}
        >
          Share your profile
        </button>
      </div>
      <div className="profile-share__url" aria-label="Public profile URL">
        {profileUrl}
      </div>
      {status ? (
        <p className="status status--success profile-share__status" role="status" aria-live="polite">
          {status}
        </p>
      ) : null}
    </div>
  );
}
