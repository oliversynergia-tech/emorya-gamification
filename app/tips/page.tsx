import type { Metadata } from "next";
import Link from "next/link";

import { SiteShell } from "@/components/site-shell";
import { getTodaysTip, dailyTips } from "@/lib/daily-tips";
import { resolveCurrentSession } from "@/server/auth/current-user";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Today's Emorya Tip",
  description: "Daily tips to help you get the most out of your Emorya journey. New tip every day.",
  openGraph: {
    title: "Today's Emorya Tip",
    description: "Daily tips to help you get the most out of your Emorya journey.",
    type: "website",
    url: `${process.env.APP_URL || "https://gravity.emorya.com"}/tips`,
  },
};

export default async function TipsPage() {
  const session = await resolveCurrentSession();
  const tip = getTodaysTip();

  return (
    <SiteShell eyebrow="Daily tip" currentUser={session?.user ?? null}>
      <section className="page-hero tip-page">
        <div className="panel panel--hero panel--hero-compact tip-page__hero">
          <p className="eyebrow">Learn a little every day</p>
          <h1>Today's Emorya Tip</h1>
          <p className="lede">
            Small pieces of product knowledge compound the same way streaks do.
          </p>
        </div>
      </section>

      <section className="grid tip-page__section" aria-labelledby="daily-tip-title">
        <article className="panel panel--glass tip-card">
          <div className="tip-card__header">
            <span className="badge badge--pink">{tip.category}</span>
          </div>
          <div className="tip-card__body">
            <h2 id="daily-tip-title">{tip.title}</h2>
            <p>{tip.body}</p>
          </div>
          <div className="tip-card__footer">
            <small className="form-note">
              Tip {tip.id} of {dailyTips.length}
            </small>
            <div className="hero__actions">
              {session ? (
                <Link className="button button--secondary" href="/dashboard#quest-board">
                  Back to quests
                </Link>
              ) : (
                <Link className="button button--primary" href="/auth">
                  Join Emorya
                </Link>
              )}
            </div>
          </div>
        </article>
      </section>
    </SiteShell>
  );
}
