"use client";

import Image from "next/image";

type ReferralWelcomeReferrer = {
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

export interface ReferralWelcomeProps {
  referrer: ReferralWelcomeReferrer;
  onContinue: () => void;
}

function formatCampaignSource(source: string | null | undefined) {
  switch (source) {
    case "zealy":
      return "Zealy";
    case "galxe":
      return "Galxe";
    case "taskon":
      return "TaskOn";
    default:
      return null;
  }
}

export function ReferralWelcome({ referrer, onContinue }: ReferralWelcomeProps) {
  const sourceLabel = formatCampaignSource(referrer.attributionSource);
  const initial = referrer.displayName.charAt(0).toUpperCase() || "E";

  return (
    <section className="referral-welcome" aria-labelledby="referral-welcome-title">
      <div className="referral-welcome__content">
        <div className="referral-welcome__intro">
          <p className="eyebrow">Welcome in</p>
          <h1 id="referral-welcome-title">You were invited by {referrer.displayName}</h1>
          <p className="lede">
            You&apos;re joining a community of people turning healthy habits into real rewards.
          </p>
        </div>

        <article className="panel panel--glass referral-welcome__card">
          <div className="referral-welcome__card-header">
            {referrer.avatarUrl ? (
              <Image
                className="public-profile-card__avatar"
                src={referrer.avatarUrl}
                alt={`${referrer.displayName} avatar`}
                width={88}
                height={88}
              />
            ) : (
              <div className="public-profile-card__avatar public-profile-card__avatar--fallback" aria-hidden="true">
                {initial}
              </div>
            )}
            <div className="referral-welcome__card-copy">
              <div className="lane-chip-row">
                <span className="badge badge--pink">Level {referrer.level}</span>
                {referrer.rank ? <span className="badge">Rank #{referrer.rank}</span> : null}
              </div>
              <h2>{referrer.displayName}</h2>
              <p className="form-note">
                {referrer.totalXp.toLocaleString()} XP · {referrer.currentStreak}-day streak ·{" "}
                {referrer.questsCompleted.toLocaleString()} quests completed
              </p>
              {referrer.rank ? (
                <p className="mission-cue mission-cue--ready">
                  <strong>Leaderboard momentum</strong> Ranked #{referrer.rank} on the leaderboard.
                </p>
              ) : null}
              {sourceLabel ? (
                <p className="form-note">{referrer.displayName} found Emorya through {sourceLabel}.</p>
              ) : null}
            </div>
          </div>
        </article>

        <div className="panel panel--glass referral-welcome__next">
          <div className="panel__header">
            <div>
              <p className="eyebrow">What&apos;s ahead</p>
              <h2>Here&apos;s how the first stretch feels</h2>
            </div>
          </div>
          <ul className="referral-welcome__list">
            <li>Complete your starter quests to get set up</li>
            <li>Build daily habits that earn you XP</li>
            <li>Climb the leaderboard alongside {referrer.displayName}</li>
          </ul>
        </div>

        <div className="referral-welcome__actions">
          <button className="button button--primary" type="button" onClick={onContinue}>
            Start Your Journey
          </button>
          <p className="form-note">You&apos;ll earn bonus XP for being referred</p>
        </div>
      </div>
    </section>
  );
}
