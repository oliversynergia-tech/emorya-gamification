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
            <span>Referral-ready</span>
            <strong>Invite on sign-up</strong>
            <small>New users can join with a referral code and trigger XP rewards automatically.</small>
          </div>
          <div className="metric-card">
            <span>Wallet linking</span>
            <strong>{brandCopy.walletProduct} path live</strong>
            <small>Signed-in users can connect their wallet without leaving the same account journey.</small>
          </div>
          <div className="metric-card">
            <span>Next reward milestone</span>
            <strong>{data.user.tokenProgram.minimumPoints} eligibility points</strong>
            <small>
              Reach level 5 and finish the activation ladder to unlock projected {data.user.tokenProgram.asset} rewards and partner payouts.
            </small>
          </div>
          <div className="metric-card">
            <span>Current experience</span>
            <strong>{laneVisualProfile.label}</strong>
            <small>
              {data.user.campaignSource
                ? data.user.campaignSource === activeCampaignLane
                  ? `Your current experience is being shaped by the ${activeCampaignLane} campaign journey.`
                  : `${data.user.campaignSource} is still credited as the source, while onboarding is currently being guided through ${activeCampaignLane}.`
                : "Direct sign-ups follow the default activation journey."}
            </small>
          </div>
          <div className="metric-card">
            <span>Premium option</span>
            <strong>{premiumOffer.title}</strong>
            <small>{premiumOffer.cta}</small>
          </div>
          <div className="metric-card">
            <span>Best upgrade path</span>
            <strong>{premiumJourney.recommendedTier} first</strong>
            <small>{premiumJourney.nextAction}</small>
          </div>
        </div>
      </section>
      <section className="grid grid--auth">
        <section className="panel panel--glass">
          <div className="panel__header">
            <div>
              <p className="eyebrow">After sign-up</p>
              <h3>What opens once your account is live</h3>
            </div>
          </div>
          <div className="info-grid">
            <div className="info-card">
              <span>Monthly referral</span>
              <strong>+{data.user.referral.rewardPreview.monthlyPremiumReferral.xp} XP</strong>
            </div>
            <div className="info-card">
              <span>Annual referral</span>
              <strong>
                +{data.user.referral.rewardPreview.annualPremiumReferral.xp} XP + {data.user.referral.rewardPreview.annualPremiumReferral.directTokenReward?.amount} {data.user.referral.rewardPreview.annualPremiumReferral.directTokenReward?.asset}
              </strong>
            </div>
            <div className="info-card">
              <span>Monthly multiplier</span>
              <strong>1.15x redemption</strong>
            </div>
            <div className="info-card">
              <span>Annual multiplier</span>
              <strong>1.30x redemption</strong>
            </div>
          </div>
          <p className="form-note">
            The journey starts with XP, then opens reward eligibility, then deeper reward moments for the strongest referral and premium outcomes.
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
            {premiumOffer.hooks.map((hook) => (
              <article key={hook} className="achievement-card">
                <div>
                  <strong>Why premium fits this journey</strong>
                  <p>{hook}</p>
                </div>
              </article>
            ))}
            {premiumJourney.pathSteps.map((step, index) => (
              <article key={step} className="achievement-card">
                <div>
                  <strong>Premium step {index + 1}</strong>
                  <p>{step}</p>
                </div>
              </article>
            ))}
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
                <h3>Your live mission needs a comeback move</h3>
              </div>
              <span className="badge badge--pink">{returnPack.label}</span>
            </div>
            <p className="form-note">{returnPack.returnAction}</p>
            <p className="form-note">{returnPack.unlockPreview}</p>
            <p className="form-note">
              Best return window: {returnPack.returnWindow === "today" ? "today" : returnPack.returnWindow === "this_week" ? "this week" : "wait for next unlock"}.
            </p>
            <p className="form-note">
              This pack is still reward-eligible. A return move worth roughly {returnPack.weeklyGoal.shortfallXp} XP closes the current weekly pace gap and keeps momentum moving.
            </p>
            <p className={`mission-cue mission-cue--${returnPack.nextQuestActionable ? "ready" : "planning"}`}>
              <strong>{returnPack.nextQuestActionable ? "Next quest ready" : "Review the route ahead"}</strong>
              {` `}
              {returnPack.nextQuestActionable && returnPack.nextQuestTitle
                ? `${returnPack.nextQuestTitle} is ready as the strongest next comeback move.`
                : "Open the mission path first to see which comeback step will move this route forward fastest."}
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
