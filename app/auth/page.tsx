import { AuthClientPanel } from "@/components/auth-client-panel";
import { MissionLink } from "@/components/mission-link";
import { SiteShell } from "@/components/site-shell";
import { WalletLinkPanel } from "@/components/wallet-link-panel";
import { getActiveBrandTheme } from "@/lib/brand-themes";
import { getBrandCopyProfile } from "@/lib/brand-copy";
import {
  getCampaignLaneVisualProfile,
  getCampaignPremiumJourney,
  getCampaignPremiumOffer,
  getCampaignSourceProfile,
} from "@/lib/campaign-source";
import { resolveCurrentSession } from "@/server/auth/current-user";
import { loadDashboardOverview } from "@/server/services/platform-overview";

export const dynamic = "force-dynamic";

export default async function AuthPage() {
  const session = await resolveCurrentSession();
  const data = await loadDashboardOverview(session?.user ?? null);
  const activeCampaignLane = data.economy.campaignPreset.source;
  const brandCopy = getBrandCopyProfile(getActiveBrandTheme().id);
  const campaignProfile = getCampaignSourceProfile(activeCampaignLane);
  const laneVisualProfile = getCampaignLaneVisualProfile(
    data.user.campaignSource ?? activeCampaignLane,
    activeCampaignLane,
    data.user.campaignSource,
  );
  const premiumOffer = getCampaignPremiumOffer(activeCampaignLane);
  const premiumJourney = getCampaignPremiumJourney(activeCampaignLane, {
    featuredTracks: data.economy.campaignPreset.featuredTracks,
    premiumUpsellMultiplier: data.economy.campaignPreset.premiumUpsellMultiplier,
    weeklyTargetOffset: data.economy.campaignPreset.weeklyTargetOffset,
  });
  const returnPack = data.campaignPacks.find((pack) => pack.returnAction) ?? null;

  return (
    <SiteShell eyebrow="Get started" currentUser={session?.user ?? null}>
      <section className="page-hero page-hero--auth">
        <div className={`panel panel--hero panel--hero-compact ${laneVisualProfile.themeClass}`}>
          <p className="eyebrow">{campaignProfile.label}</p>
          <h2>{campaignProfile.title}</h2>
          <p className="lede">
            {campaignProfile.description}
          </p>
          <div className="lane-chip-row">
            {laneVisualProfile.chips.map((chip) => (
              <span key={chip} className="badge">
                {chip}
              </span>
            ))}
          </div>
          <p className="form-note">{laneVisualProfile.emphasis}</p>
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
            <strong>{premiumOffer.title}</strong>
            <small>
              {data.user.campaignSource
                ? data.user.campaignSource === activeCampaignLane
                  ? premiumOffer.cta
                  : `${data.user.campaignSource} remains the source while ${activeCampaignLane} is shaping this onboarding flow.`
                : premiumOffer.cta}
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
              <span>Referral rewards</span>
              <strong>Invite and grow faster</strong>
            </div>
            <div className="info-card">
              <span>Wallet-linked rewards</span>
              <strong>Deeper progression unlocks</strong>
            </div>
            <div className="info-card">
              <span>Premium lift</span>
              <strong>{premiumJourney.recommendedTier} is the strongest first step</strong>
            </div>
            <div className="info-card">
              <span>Reward direction</span>
              <strong>{data.user.tokenProgram.asset} readiness follows progress</strong>
            </div>
          </div>
          <p className="form-note">
            Sign-up is only the start. The real value comes from activation, repeat use, and the stronger reward paths that open after that.
          </p>
          <div className="achievement-list">
            <article className={`achievement-card lane-summary-card ${laneVisualProfile.themeClass}`}>
              <div>
                <strong>{laneVisualProfile.label}</strong>
                <p>{laneVisualProfile.emphasis}</p>
              </div>
              <div className="achievement-card__side">
                <span>{campaignProfile.accent}</span>
              </div>
            </article>
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
                <strong>Premium deepens the value</strong>
                <p>{premiumJourney.nextAction}</p>
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
                <p className="eyebrow">Return path</p>
                <h3>Pick up where you left off</h3>
              </div>
              <span className="badge badge--pink">{returnPack.label}</span>
            </div>
            <p className="form-note">{returnPack.returnAction}</p>
            <p className="form-note">
              Best return window: {returnPack.returnWindow === "today" ? "today" : returnPack.returnWindow === "this_week" ? "this week" : "after the next unlock"}.
            </p>
            <p className={`mission-cue mission-cue--${returnPack.nextQuestActionable ? "ready" : "planning"}`}>
              <strong>{returnPack.nextQuestActionable ? "Next quest ready" : "Review the route ahead"}</strong>
              {` `}
              {returnPack.nextQuestActionable && returnPack.nextQuestTitle
                ? `${returnPack.nextQuestTitle} is ready as the strongest next comeback move.`
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
          <AuthClientPanel
            campaignSource={data.user.campaignSource}
            premiumOffer={premiumOffer}
            premiumJourney={premiumJourney}
          />
        </div>
        {session ? (
          <WalletLinkPanel walletAddresses={session.walletAddresses} activeMissionView="active" />
        ) : (
          <section className="panel auth-panel panel--glass">
            <div className="panel__header">
              <div>
                <p className="eyebrow">Wallet link</p>
                <h3>Sign in first</h3>
              </div>
            </div>
            <p className="form-note">
              Wallet linking is available once you are signed in. After sign-in, refresh this page if needed.
            </p>
          </section>
        )}
      </section>
    </SiteShell>
  );
}
