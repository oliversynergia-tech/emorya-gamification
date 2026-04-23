import { redirect } from "next/navigation";

import { AuthClientPanel } from "@/components/auth-client-panel";
import { MissionLink } from "@/components/mission-link";
import { SiteShell } from "@/components/site-shell";
import { getActiveBrandTheme } from "@/lib/brand-themes";
import { getBrandCopyProfile } from "@/lib/brand-copy";
import { resolveCurrentSession } from "@/server/auth/current-user";
import { loadDashboardOverview } from "@/server/services/platform-overview";

export const dynamic = "force-dynamic";

export default async function AuthPage({
  searchParams,
}: {
  searchParams?: Promise<{ ref?: string | string[] }>;
}) {
  const session = await resolveCurrentSession();

  if (session) {
    redirect("/dashboard");
  }

  const resolvedSearchParams = await searchParams;
  const referralParam = Array.isArray(resolvedSearchParams?.ref)
    ? resolvedSearchParams?.ref[0]
    : resolvedSearchParams?.ref;
  const initialReferralCode = referralParam?.trim().toUpperCase() ?? "";
  const data = await loadDashboardOverview(null);
  const brandCopy = getBrandCopyProfile(getActiveBrandTheme().id);
  const returnPack = data.campaignPacks.find((pack) => pack.returnAction) ?? null;

  return (
    <SiteShell eyebrow="Get started" currentUser={null} hideAuthAction>
      <section className="page-hero page-hero--auth">
        <div className="panel panel--hero panel--hero-compact lane-theme--direct">
          <p className="eyebrow">Get started</p>
          <h1>Create your account and start building progress.</h1>
          <p className="lede">
            Set up your account, connect what you need, and come back regularly to build real momentum.
          </p>
          <div className="lane-chip-row">
            <span className="badge">Create your account</span>
            <span className="badge">Connect your wallet</span>
            <span className="badge">Come back often</span>
          </div>
          <p className="form-note">A few simple steps now make the rest of the experience much easier.</p>
          <div className="hero__actions">
            <a className="button button--primary" href="#auth-panel">
              Sign in or create account
            </a>
            <a className="button button--secondary" href="/dashboard#campaign-mission">
              Explore the dashboard
            </a>
          </div>
        </div>
        <div className="panel panel--stack page-aside">
          <div className="metric-card">
            <span>Fast start</span>
            <strong>Create your account</strong>
            <small>Get into the app, start your activation path, and unlock the first real rewards.</small>
          </div>
          <div className="metric-card">
            <span>Wallet linking</span>
            <strong>Connect {brandCopy.walletProduct}</strong>
            <small>Link your wallet when you are ready to move deeper into rewards and progression.</small>
          </div>
          <div className="metric-card">
            <span>First milestone</span>
            <strong>Finish the activation ladder</strong>
            <small>
              That is where setup gives way to real progress, momentum, and rewards.
            </small>
          </div>
          <div className="metric-card">
            <span>Premium path</span>
            <strong>Go further when you are ready</strong>
            <small>
              Premium is there when you want faster progress, stronger rewards, and more from the time you put in.
            </small>
          </div>
        </div>
      </section>
      <section className="grid grid--auth">
        <section className="panel panel--glass">
          <div className="panel__header">
            <div>
              <p className="eyebrow">After sign-up</p>
              <h2>What opens next</h2>
            </div>
          </div>
          <div className="info-grid">
            <div className="info-card">
              <span>Invite friends</span>
              <strong>Grow faster together</strong>
            </div>
            <div className="info-card">
              <span>Wallet connection</span>
              <strong>Unlock more when you are ready</strong>
            </div>
            <div className="info-card">
              <span>Premium option</span>
              <strong>Monthly is the easiest first upgrade</strong>
            </div>
            <div className="info-card">
              <span>Rewards</span>
              <strong>Future rewards come later as XP progress grows</strong>
            </div>
          </div>
          <p className="form-note">
            Signing up is just the first step. The real value comes from getting set up properly, coming back often, and building steady progress over time.
          </p>
          <div className="achievement-list">
            <article className="achievement-card">
              <div>
                <strong>Activation comes first</strong>
                <p>Complete your setup, connect the right tools, and start the first real in-app actions.</p>
              </div>
            </article>
            <article className="achievement-card">
              <div>
                <strong>Momentum comes next</strong>
                <p>Weekly progress, repeat use, and referrals are what turn a new account into real momentum.</p>
              </div>
            </article>
            <article className="achievement-card">
              <div>
                <strong>Premium can come later</strong>
                <p>Start free, learn the product, and upgrade later if you want stronger rewards and faster progress.</p>
              </div>
            </article>
          </div>
        </section>
        <section className="panel panel--glass">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Activation ladder</p>
              <h2>{data.user.starterPath.title}</h2>
            </div>
            <span className="badge">{Math.round(data.user.starterPath.progress * 100)}%</span>
          </div>
          <p className="form-note">{data.user.starterPath.summary}</p>
          {data.user.starterPath.nextStepLabel ? (
            <p className="mission-cue mission-cue--planning">
              <strong>Next activation move</strong> {data.user.starterPath.nextStepLabel}. {data.user.starterPath.nextStepDetail}
            </p>
          ) : (
            <p className="mission-cue mission-cue--ready">
              <strong>{data.user.starterPath.completionLabel}</strong> {data.user.starterPath.completionDetail}
            </p>
          )}
          <div className="achievement-list">
            {data.user.starterPath.steps.map((step) => (
              <article key={step.label} className="achievement-card">
                <div>
                  <strong>{step.label}</strong>
                  <p>{step.detail}</p>
                </div>
                <span className={step.complete ? "badge badge--pink" : "badge"}>{step.complete ? "Done" : "Open"}</span>
              </article>
            ))}
          </div>
        </section>
        {returnPack ? (
          <section className="panel panel--glass">
            <div className="panel__header">
              <div>
                <p className="eyebrow">Pick up again</p>
                <h2>Pick up where you left off</h2>
              </div>
              <span className="badge badge--pink">{returnPack.label}</span>
            </div>
            <p className="form-note">{returnPack.returnAction}</p>
            <p className="form-note">
              Best time to return: {returnPack.returnWindow === "today" ? "today" : returnPack.returnWindow === "this_week" ? "this week" : "after the next unlock"}.
            </p>
            <p className={`mission-cue mission-cue--${returnPack.nextQuestActionable ? "ready" : "planning"}`}>
              <strong>{returnPack.nextQuestActionable ? "Your next quest is ready" : "See what to do next"}</strong>
              {` `}
              {returnPack.nextQuestActionable && returnPack.nextQuestTitle
                ? `${returnPack.nextQuestTitle} is the best next step right now.`
                : "Open your quests to see the best next step."}
            </p>
            <div className="hero__actions">
              <MissionLink
                className="button button--primary"
                href={returnPack.ctaHref ?? "/dashboard#campaign-mission"}
                packId={returnPack.packId}
                eventType="auth_return_cta"
                ctaLabel={returnPack.ctaLabel}
                ctaVariant={returnPack.ctaVariant}
                missionView="active"
              >
                {returnPack.ctaLabel}
              </MissionLink>
              <MissionLink
                className="button button--secondary"
                href="/dashboard#campaign-mission"
                packId={returnPack.packId}
                eventType="auth_dashboard_return_cta"
                ctaLabel="Return to dashboard quests"
                ctaVariant="return_path"
                missionView="active"
              >
                Return to dashboard quests
              </MissionLink>
            </div>
        </section>
      ) : null}
      {initialReferralCode ? (
        <section className="panel panel--glass referral-invite-banner">
          <div>
            <p className="eyebrow">Invite accepted</p>
            <h2>Your referral code is ready.</h2>
            <p>Create your account below and the code will be applied automatically.</p>
          </div>
          <span className="badge">{initialReferralCode}</span>
        </section>
      ) : null}
      </section>
      <section className="grid grid--auth">
        <div id="auth-panel">
          <AuthClientPanel
            initialReferralCode={initialReferralCode}
            initialMode={initialReferralCode ? "signup" : "signin"}
          />
        </div>
        <section className="panel auth-panel auth-panel--compact panel--glass">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Wallet link</p>
              <h2>Connect your wallet after account setup</h2>
            </div>
          </div>
          <p className="form-note">
            Create an account or sign in first. Once you are in, this panel becomes your wallet connection step.
          </p>
          <div className="info-grid">
            <div className="info-card">
              <span>Step 1</span>
              <strong>Access your account</strong>
            </div>
            <div className="info-card">
              <span>Step 2</span>
              <strong>Connect your wallet</strong>
            </div>
          </div>
          <div className="hero__actions">
            <a className="button button--primary" href="#auth-panel">
              Go to account access
            </a>
          </div>
        </section>
      </section>
    </SiteShell>
  );
}
