"use client";

import { useMemo, useState } from "react";

type ReferralSharePanelProps = {
  referralCode: string;
  invitedCount: number;
  convertedCount: number;
  rewardXpEarned: number;
};

function getReferralUrl(referralCode: string) {
  const encodedCode = encodeURIComponent(referralCode);

  if (typeof window !== "undefined") {
    return `${window.location.origin}/auth?ref=${encodedCode}`;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  return `${appUrl || "https://emorya.com"}/auth?ref=${encodedCode}`;
}

export function ReferralSharePanel({
  referralCode,
  invitedCount,
  convertedCount,
  rewardXpEarned,
}: ReferralSharePanelProps) {
  const [status, setStatus] = useState<string | null>(null);
  const referralUrl = useMemo(() => getReferralUrl(referralCode), [referralCode]);
  const shareText = `Join me on Emorya and start building progress. Use my invite link: ${referralUrl}`;

  async function copyReferralLink() {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setStatus("Invite link copied.");
    } catch {
      setStatus("Copy failed. Select the link and copy it manually.");
    }
  }

  async function shareReferralLink() {
    if (!navigator.share) {
      await copyReferralLink();
      return;
    }

    try {
      await navigator.share({
        title: "Join me on Emorya",
        text: "Start building progress with me on Emorya.",
        url: referralUrl,
      });
      setStatus("Share sheet opened.");
    } catch {
      setStatus("Share cancelled. Your invite link is still ready here.");
    }
  }

  return (
    <section className="referral-share-card">
      <div>
        <p className="eyebrow">Invite link</p>
        <h3>Bring friends into your progress loop.</h3>
        <p>
          Share your invite link with people who want to start using Emorya. When they join and keep progressing, your referral rewards can grow too.
        </p>
      </div>
      <div className="referral-share-card__link" aria-label="Referral invite link">
        {referralUrl}
      </div>
      <div className="referral-share-card__actions">
        <button type="button" className="button button--primary" onClick={copyReferralLink}>
          Copy invite link
        </button>
        <button type="button" className="button button--secondary" onClick={shareReferralLink}>
          Share
        </button>
      </div>
      <div className="referral-share-card__stats" aria-label="Referral progress summary">
        <span>{invitedCount} invited</span>
        <span>{convertedCount} converted</span>
        <span>{rewardXpEarned} referral XP</span>
      </div>
      <p className="form-note">Referral code: {referralCode}</p>
      <p className="form-note">{shareText}</p>
      {status ? <p className="status status--success" role="status" aria-live="polite">{status}</p> : null}
    </section>
  );
}
