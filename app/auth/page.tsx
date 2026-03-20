import { AuthClientPanel } from "@/components/auth-client-panel";
import { MissionLink } from "@/components/mission-link";
import { SiteShell } from "@/components/site-shell";
import { WalletLinkPanel } from "@/components/wallet-link-panel";
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
    <SiteShell eyebrow="Account access" currentUser={session?.user ?? null}>
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
              Open auth form
            </a>
            <a className="button button--secondary" href="/dashboard#campaign-mission">
              See dashboard
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
            <strong>xPortal path live</strong>
            <small>Signed users can attach MultiversX identity without splitting their profile.</small>
          </div>
          <div className="metric-card">
            <span>Reward path</span>
            <strong>{data.user.tokenProgram.minimumPoints} eligibility points</strong>
            <small>
              Level 5 plus Starter Path opens projected {data.user.tokenProgram.asset} redemption and partner campaign payout lanes.
            </small>
          </div>
          <div className="metric-card">
            <span>Active lane</span>
            <strong>{laneVisualProfile.label}</strong>
            <small>
              {data.user.campaignSource
                ? data.user.campaignSource === activeCampaignLane
                  ? `This account is currently running through the ${activeCampaignLane} experience lane.`
                  : `This account is attributed to ${data.user.campaignSource}, but the live onboarding path is currently routed through the ${activeCampaignLane} bridge lane.`
                : "Direct onboarding uses the default Emorya starter ladder."}
            </small>
          </div>
          <div className="metric-card">
            <span>Premium hook</span>
            <strong>{premiumOffer.title}</strong>
            <small>{premiumOffer.cta}</small>
          </div>
          <div className="metric-card">
            <span>Premium path</span>
            <strong>{premiumJourney.recommendedTier} first</strong>
            <small>{premiumJourney.nextAction}</small>
          </div>
        </div>
      </section>
      <section className="grid grid--auth">
        <section className="panel panel--glass">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Reward preview</p>
              <h3>What opens after account creation</h3>
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
            The funnel starts with XP, then opens token eligibility, then direct-token partner moments for the highest-value referral and premium outcomes.
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
                  <strong>Why premium fits this lane</strong>
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
              <p className="eyebrow">Onboarding ladder</p>
              <h3>Starter Path to reward eligibility</h3>
            </div>
            <span className="badge">{Math.round(data.user.starterPath.progress * 100)}%</span>
          </div>
          <div className="achievement-list">
            {data.user.starterPath.steps.slice(0, 4).map((step) => (
              <article key={step.label} className="achievement-card">
                <div>
                  <strong>{step.label}</strong>
                  <p>{step.detail}</p>
                </div>
                <span className={step.complete ? "badge badge--pink" : "badge"}>{step.complete ? "Done" : "Next"}</span>
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
              This pack is still reward-eligible. A return move worth roughly {returnPack.weeklyGoal.shortfallXp} XP closes the current weekly pace gap and keeps the mission lane warm.
            </p>
            <p className={`mission-cue mission-cue--${returnPack.nextQuestActionable ? "ready" : "planning"}`}>
              <strong>{returnPack.nextQuestActionable ? "Exact quest ready" : "Review mission path"}</strong>
              {` `}
              {returnPack.nextQuestActionable && returnPack.nextQuestTitle
                ? `${returnPack.nextQuestTitle} is ready as the strongest next comeback move.`
                : "Open the mission path first to see which comeback step is most useful now."}
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
