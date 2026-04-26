import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SiteShell } from "@/components/site-shell";
import { resolveCurrentSession } from "@/server/auth/current-user";
import { getPublicProfileByReferralCode } from "@/server/services/public-profile-page";

export const revalidate = 300;

function formatCount(value: number) {
  return value.toLocaleString("en-US");
}

function formatJoinedDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function formatEarnedDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getInitial(value: string) {
  return value.trim().charAt(0).toUpperCase() || "E";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const user = await getPublicProfileByReferralCode(code);

  if (!user) {
    return { title: "Profile Not Found — Emorya" };
  }

  const description = `${user.displayName} is Level ${user.level} with ${user.totalXp.toLocaleString("en-US")} XP and a ${user.currentStreak}-day streak on Emorya.`;

  return {
    title: `${user.displayName} — Level ${user.level} on Emorya`,
    description,
    openGraph: {
      title: `${user.displayName} — Level ${user.level} on Emorya`,
      description,
      type: "profile",
      url: `${process.env.APP_URL || "https://gravity.emorya.com"}/u/${user.referralCode}`,
    },
    twitter: {
      card: "summary",
      title: `${user.displayName} — Level ${user.level} on Emorya`,
      description: `Level ${user.level} · ${user.totalXp.toLocaleString("en-US")} XP · ${user.currentStreak}-day streak`,
    },
  };
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const session = await resolveCurrentSession();
  const { code } = await params;
  const profile = await getPublicProfileByReferralCode(code);

  if (!profile) {
    notFound();
  }

  return (
    <SiteShell currentUser={session?.user ?? null}>
      <section className="page-hero public-profile-hero">
        <div className="panel panel--hero panel--hero-compact public-profile-card">
          <div className="public-profile-card__header">
            {profile.avatarUrl ? (
              <img
                className="public-profile-card__avatar"
                src={profile.avatarUrl}
                alt={`${profile.displayName} avatar`}
              />
            ) : (
              <div className="public-profile-card__avatar public-profile-card__avatar--fallback" aria-hidden="true">
                {getInitial(profile.displayName)}
              </div>
            )}
            <div className="public-profile-card__intro">
              <p className="eyebrow">Public profile</p>
              <h1>{profile.displayName}</h1>
              <div className="lane-chip-row">
                <span className="badge">Lv. {profile.level}</span>
                <span className="badge">Joined {formatJoinedDate(profile.createdAt)}</span>
              </div>
              <p className="lede">
                {profile.totalXp.toLocaleString("en-US")} XP earned and a {profile.currentStreak}-day streak built on
                Emorya.
              </p>
              {profile.leaderboardRank ? (
                <p className="form-note">
                  Ranked <Link href="/leaderboard/public">#{profile.leaderboardRank.rank} on the all-time leaderboard</Link>
                </p>
              ) : (
                <p className="form-note">Not yet ranked.</p>
              )}
              {profile.referralRank ? (
                <p className="form-note">
                  Ranked <Link href="/leaderboard/public?period=referral">#{profile.referralRank.rank} in referrals</Link>
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="grid landing-section" aria-labelledby="public-profile-stats-title">
        <section className="panel panel--glass">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Progress snapshot</p>
              <h2 id="public-profile-stats-title">What {profile.displayName} has built so far</h2>
            </div>
          </div>
          <div className="landing-stat-grid" role="region" aria-label={`${profile.displayName} public stats`}>
            <article className="metric-card">
              <span>Total XP</span>
              <strong>{formatCount(profile.totalXp)}</strong>
              <small>Total XP earned on the platform.</small>
            </article>
            <article className="metric-card">
              <span>Day Streak</span>
              <strong>{profile.currentStreak > 0 ? `🔥 ${formatCount(profile.currentStreak)}` : "0"}</strong>
              <small>Current streak in progress.</small>
            </article>
            <article className="metric-card">
              <span>Best Streak</span>
              <strong>{formatCount(profile.longestStreak)}</strong>
              <small>Longest streak reached so far.</small>
            </article>
            <article className="metric-card">
              <span>Quests Done</span>
              <strong>{formatCount(profile.completedQuests)}</strong>
              <small>Approved quests completed.</small>
            </article>
          </div>
        </section>
      </section>

      <section className="grid landing-section" aria-labelledby="public-profile-achievements-title">
        <section className="panel panel--glass">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Achievements</p>
              <h2 id="public-profile-achievements-title">Milestones worth sharing</h2>
            </div>
          </div>
          {profile.achievements.length > 0 ? (
            <div className="public-profile-achievements" role="region" aria-label={`${profile.displayName} achievements`}>
              {profile.achievements.map((achievement) => (
                <article key={`${achievement.name}-${achievement.earnedAt}`} className="achievement-card public-achievement-card">
                  <div className="achievement-card__content">
                    <div className="lane-chip-row">
                      <span className="badge">{achievement.category}</span>
                    </div>
                    <h3>{achievement.name}</h3>
                    <p>{achievement.description}</p>
                    <small>Earned {formatEarnedDate(achievement.earnedAt)}</small>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="form-note">No achievements earned yet.</p>
          )}
        </section>
      </section>

      <section className="grid landing-section" aria-labelledby="public-profile-referral-title">
        <section className="panel panel--glass landing-final-cta">
          <p className="eyebrow">Join in</p>
          <h2 id="public-profile-referral-title">Join {profile.displayName} on Emorya</h2>
          <p className="form-note">Create your account and start your own journey.</p>
          <div className="hero__actions">
            <Link className="button button--primary" href={`/auth?ref=${encodeURIComponent(profile.referralCode)}`}>
              Get Started
            </Link>
          </div>
        </section>
      </section>
    </SiteShell>
  );
}
