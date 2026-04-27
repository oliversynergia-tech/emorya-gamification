import type { Metadata } from "next";
import Link from "next/link";

import { SiteShell } from "@/components/site-shell";
import { resolveCurrentSession } from "@/server/auth/current-user";
import {
  loadPublicLeaderboardData,
  normalizePublicLeaderboardPeriod,
  type PublicLeaderboardPeriod,
} from "@/server/services/public-leaderboard-page";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Leaderboard — Emorya",
  description: "See who's leading the Emorya community. Top users ranked by XP, streaks, and referrals.",
  openGraph: {
    title: "Leaderboard — Emorya",
    description: "See who's leading the Emorya community. Top users ranked by XP, streaks, and referrals.",
    type: "website",
    url: `${process.env.APP_URL || "https://gravity.emorya.com"}/leaderboard/public`,
  },
  twitter: {
    card: "summary_large_image",
    title: "Leaderboard — Emorya",
    description: "See who's leading the Emorya community. Top users ranked by XP, streaks, and referrals.",
  },
};

const leaderboardTabs: Array<{ label: string; period: PublicLeaderboardPeriod }> = [
  { label: "All-Time", period: "all-time" },
  { label: "Weekly", period: "weekly" },
  { label: "Monthly", period: "monthly" },
  { label: "Referral", period: "referral" },
];

function getPeriodHref(period: PublicLeaderboardPeriod) {
  return period === "all-time" ? "/leaderboard/public" : `/leaderboard/public?period=${period}`;
}

function getPodiumClass(rank: number) {
  if (rank === 1) {
    return " public-leaderboard__row--gold";
  }

  if (rank === 2) {
    return " public-leaderboard__row--silver";
  }

  if (rank === 3) {
    return " public-leaderboard__row--bronze";
  }

  return "";
}

function formatPublicScore(score: number, scoreLabel: "XP" | "Referrals") {
  if (scoreLabel === "Referrals") {
    return `${score.toLocaleString("en-US")} referral${score === 1 ? "" : "s"}`;
  }

  return `${score.toLocaleString("en-US")} XP`;
}

export default async function PublicLeaderboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ period?: string | string[] }>;
}) {
  const session = await resolveCurrentSession();
  const resolvedSearchParams = await searchParams;
  const period = normalizePublicLeaderboardPeriod(resolvedSearchParams?.period);
  const data = await loadPublicLeaderboardData(period);

  return (
    <SiteShell eyebrow="Leaderboard" currentUser={session?.user ?? null}>
      <section className="page-hero page-hero--leaderboard">
        <div className="panel panel--hero panel--hero-compact page-hero__single">
          <p className="eyebrow">Leaderboard</p>
          <h1>Leaderboard</h1>
          <p className="lede">Top performers across the Emorya community.</p>
        </div>
      </section>

      <section className="grid landing-section" aria-labelledby="public-leaderboard-title">
        <section className="panel panel--glass">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Public rankings</p>
              <h2 id="public-leaderboard-title">See who is leading right now</h2>
            </div>
          </div>

          <nav className="public-leaderboard-tabs" aria-label="Leaderboard periods">
            {leaderboardTabs.map((tab) => {
              const isActive = tab.period === period;

              return (
                <Link
                  key={tab.period}
                  href={getPeriodHref(tab.period)}
                  className={`public-leaderboard-tabs__link${isActive ? " public-leaderboard-tabs__link--active" : ""}`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>

          {data.entries.length > 0 ? (
            <div className="public-leaderboard" role="region" aria-label={`${period} leaderboard`}>
              <div className="public-leaderboard__header" aria-hidden="true">
                <span>Rank</span>
                <span>Display Name</span>
                <span>Level</span>
                <span>Streak</span>
                <span>{data.scoreLabel}</span>
              </div>
              <ol className="public-leaderboard__list">
                {data.entries.map((entry) => (
                  <li
                    key={`${period}-${entry.rank}-${entry.displayName}-${entry.referralCode ?? "no-code"}`}
                    className={`public-leaderboard__row${getPodiumClass(entry.rank)}`}
                  >
                    <span className="public-leaderboard__rank">#{entry.rank}</span>
                    {entry.referralCode ? (
                      <Link className="public-leaderboard__name public-leaderboard__name-link" href={`/u/${entry.referralCode}`}>
                        {entry.displayName}
                      </Link>
                    ) : (
                      <strong className="public-leaderboard__name">{entry.displayName}</strong>
                    )}
                    <span className="public-leaderboard__level">Lv. {entry.level}</span>
                    <span className="public-leaderboard__streak">{entry.currentStreak}-day streak</span>
                    <span className="public-leaderboard__score">
                      {formatPublicScore(entry.score, data.scoreLabel)}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <p className="form-note">No data for this period yet. Check back soon.</p>
          )}
        </section>
      </section>

      <section className="grid landing-section" aria-labelledby="public-leaderboard-cta-title">
        <section className="panel panel--glass landing-final-cta">
          <p className="eyebrow">Join the board</p>
          <h2 id="public-leaderboard-cta-title">Where would you rank?</h2>
          <p className="form-note">
            Create an account and start earning XP to claim your place on the board.
          </p>
          <div className="hero__actions">
            <Link className="button button--primary" href="/auth">
              Join Emorya
            </Link>
          </div>
        </section>
      </section>
    </SiteShell>
  );
}
