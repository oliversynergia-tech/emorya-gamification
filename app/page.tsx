import type { Metadata } from "next";
import Link from "next/link";

import { SiteShell } from "@/components/site-shell";
import { resolveCurrentSession } from "@/server/auth/current-user";
import { loadPublicLandingData } from "@/server/services/public-landing-page";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Emorya — Turn Healthy Habits Into Real Rewards",
  description:
    "Track movement, earn XP, climb the leaderboard, and build streaks that matter. Join the Emorya gamification platform.",
  openGraph: {
    title: "Emorya — Turn Healthy Habits Into Real Rewards",
    description: "Track movement, earn XP, climb the leaderboard, and build streaks that matter.",
    type: "website",
    url: process.env.APP_URL || "https://gravity.emorya.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "Emorya — Turn Healthy Habits Into Real Rewards",
    description: "Track movement, earn XP, climb the leaderboard, and build streaks that matter.",
  },
};

const questJourneySteps = [
  {
    title: "Get Started",
    description: "Download the app, create your account, and set up your profile.",
  },
  {
    title: "Build Daily Habits",
    description: "Log calorie burns, spin the daily wheel, and engage with the community.",
  },
  {
    title: "Connect Your Wallet",
    description: "Link your xPortal wallet to unlock reward-ready features.",
  },
  {
    title: "Climb the Ladder",
    description: "Complete calorie challenges from 500-in-24 to the 30-day Emorya Marathon.",
  },
  {
    title: "Earn & Stake",
    description: "Reach staking thresholds, unlock APY boosts, and build long-term value.",
  },
  {
    title: "Go Premium",
    description: "Unlock 1.5x XP and 1.3x token multipliers with an annual plan.",
  },
];

function formatCount(value: number) {
  return value.toLocaleString("en-US");
}

export default async function HomePage() {
  const session = await resolveCurrentSession();
  const data = await loadPublicLandingData();

  return (
    <SiteShell currentUser={session?.user ?? null}>
      <section className="page-hero landing-hero">
        <div className="panel panel--hero panel--hero-compact">
          <p className="eyebrow">Emorya Quests</p>
          <h1>Turn healthy habits into real rewards</h1>
          <p className="lede">
            Track movement, earn XP, climb the leaderboard, and build streaks that matter.
          </p>
          <div className="lane-chip-row">
            <span className="badge">Daily habits</span>
            <span className="badge">Leaderboard climbs</span>
            <span className="badge">Wallet-ready progression</span>
          </div>
          <div className="hero__actions">
            <Link className="button button--primary" href="/auth">
              Get Started
            </Link>
            {session ? (
              <Link className="button button--secondary" href="/dashboard">
                Go to Dashboard
              </Link>
            ) : null}
          </div>
        </div>
        <div className="panel panel--stack page-aside">
          <div className="metric-card">
            <span>Quest rhythm</span>
            <strong>Daily, social, and milestone quests</strong>
            <small>Progress moves through repeat habits first, then opens deeper reward-ready paths.</small>
          </div>
          <div className="metric-card">
            <span>Leaderboard pace</span>
            <strong>Live rank movement</strong>
            <small>Every approved quest, streak, and referral can push you higher.</small>
          </div>
          <div className="metric-card">
            <span>Wallet-ready path</span>
            <strong>Optional for launch</strong>
            <small>Link xPortal when you want to prepare for deeper reward features later.</small>
          </div>
        </div>
      </section>

      <section className="grid landing-section" aria-labelledby="landing-stats-title">
        <section className="panel panel--glass">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Live platform stats</p>
              <h2 id="landing-stats-title">What the platform is doing right now</h2>
            </div>
          </div>
          <div className="landing-stat-grid" role="region" aria-label="Live platform stats">
            <article className="metric-card">
              <span>Total users</span>
              <strong>{formatCount(data.stats.totalUsers)}</strong>
              <small>People building progress inside Emorya.</small>
            </article>
            <article className="metric-card">
              <span>Quests completed</span>
              <strong>{formatCount(data.stats.questsCompleted)}</strong>
              <small>Approved quests moving the board forward.</small>
            </article>
            <article className="metric-card">
              <span>Total XP distributed</span>
              <strong>{formatCount(data.stats.totalXpDistributed)}</strong>
              <small>XP earned across the community so far.</small>
            </article>
            <article className="metric-card">
              <span>Active streaks</span>
              <strong>{formatCount(data.stats.activeStreaks)}</strong>
              <small>Users currently keeping momentum alive.</small>
            </article>
          </div>
        </section>
      </section>

      <section className="grid landing-section" aria-labelledby="landing-journey-title">
        <section className="panel panel--glass">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Quest journey overview</p>
              <h2 id="landing-journey-title">How progress unfolds inside Emorya</h2>
            </div>
          </div>
          <ol className="landing-journey" aria-label="Quest journey overview">
            {questJourneySteps.map((step, index) => (
              <li key={step.title} className="landing-journey__step">
                <div className="landing-journey__index" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </section>

      <section className="grid landing-section landing-section--split" aria-labelledby="landing-leaderboard-title">
        <section className="panel panel--glass">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Leaderboard top 10</p>
              <h2 id="landing-leaderboard-title">See who is leading the board</h2>
            </div>
          </div>
          {data.leaderboard.length > 0 ? (
            <div className="landing-leaderboard" role="region" aria-label="Top ten leaderboard">
              <div className="landing-leaderboard__header" aria-hidden="true">
                <span>Rank</span>
                <span>Player</span>
                <span>Level</span>
                <span>XP</span>
              </div>
              <ol className="landing-leaderboard__list">
                {data.leaderboard.map((entry) => (
                  <li key={`${entry.rank}-${entry.displayName}`} className="landing-leaderboard__row">
                    <span className="landing-leaderboard__rank">#{entry.rank}</span>
                    <span className="landing-leaderboard__name">{entry.displayName}</span>
                    <span className="landing-leaderboard__level">Level {entry.level}</span>
                    <span className="landing-leaderboard__xp">{formatCount(entry.xp)} XP</span>
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <p className="form-note">The all-time leaderboard will appear once the first snapshot is published.</p>
          )}
          <div className="landing-inline-cta">
            <Link className="button button--secondary" href="/auth">
              Where would you rank?
            </Link>
            <Link className="text-link landing-inline-link" href="/leaderboard/public">
              View full leaderboard
            </Link>
          </div>
        </section>

        <section className="panel panel--glass" aria-labelledby="landing-activity-title">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Recent activity</p>
              <h2 id="landing-activity-title">The platform is moving right now</h2>
            </div>
          </div>
          {data.activity.length > 0 ? (
            <ul className="landing-activity" aria-label="Recent platform activity">
              {data.activity.map((item) => (
                <li key={`${item.actor}-${item.action}-${item.timeAgo}`} className="landing-activity__item">
                  <div>
                    <strong>{item.actor}</strong>
                    <p>
                      {item.action} · {item.detail}
                    </p>
                  </div>
                  <span>{item.timeAgo}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="form-note">Recent activity will show up here as users complete quests and unlock progress.</p>
          )}
        </section>
      </section>

      <section className="grid landing-section" aria-labelledby="landing-final-cta-title">
        <section className="panel panel--glass landing-final-cta">
          <p className="eyebrow">Start now</p>
          <h2 id="landing-final-cta-title">Ready to start your journey?</h2>
          <div className="hero__actions">
            <Link className="button button--primary" href="/auth">
              Create Your Account
            </Link>
          </div>
          <p className="form-note">
            Already have an account? <Link href="/auth">Sign in</Link>
          </p>
        </section>
      </section>
    </SiteShell>
  );
}
