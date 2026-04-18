import { AuthClientPanel } from "@/components/auth-client-panel";
import { MissionLink } from "@/components/mission-link";
import { SiteShell } from "@/components/site-shell";
import { WalletLinkPanel } from "@/components/wallet-link-panel";
import { getActiveBrandTheme } from "@/lib/brand-themes";
import { getBrandCopyProfile } from "@/lib/brand-copy";
import { resolveCurrentSession } from "@/server/auth/current-user";
import { loadDashboardOverview } from "@/server/services/platform-overview";

export const dynamic = "force-dynamic";

export default async function AuthPage() {
  const session = await resolveCurrentSession();
  const data = await loadDashboardOverview(session?.user ?? null);
  const brandCopy = getBrandCopyProfile(getActiveBrandTheme().id);
  const returnPack = data.campaignPacks.find((pack) => pack.returnAction) ?? null;

  return (
    <SiteShell eyebrow="Get started" currentUser={session?.user ?? null}>
      <section className="page-hero page-hero--auth">
        <div className="panel panel--hero panel--hero-compact lane-theme--direct">
          <p className="eyebrow">Get started</p>
          <h2>Create your account and start building progress.</h2>
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
              <h3>What opens next</h3>
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
              <strong>{data.user.tokenProgram.asset} rewards come later as progress grows</strong>
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
              <h3>{data.user.starterPath.title}</h3>
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
                <h3>Pick up where you left off</h3>
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
                : "Open your missions to see the best next step."}
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
                ctaLabel="Return to dashboard mission"
                ctaVariant="return_path"
                missionView="active"
              >
                Return to dashboard mission
              </MissionLink>
            </div>
          </section>
        ) : null}
      </section>
      <section className="grid grid--auth">
        <div id="auth-panel">
          <AuthClientPanel />
        </div>
        {session ? (
          <WalletLinkPanel walletAddresses={session.walletAddresses} activeMissionView="active" />
        ) : (
          <section className="panel auth-panel auth-panel--compact panel--glass">
            <div className="panel__header">
              <div>
                <p className="eyebrow">Wallet link</p>
                <h3>Sign in first</h3>
              </div>
            </div>
            <p className="form-note">
              Sign in above first, then come back here to connect your wallet and unlock the next parts of the experience.
            </p>
            <div className="hero__actions">
              <a className="button button--primary" href="#auth-panel">
                Sign in above to connect your wallet
              </a>
            </div>
          </section>
        )}
      </section>
    </SiteShell>
  );
}
