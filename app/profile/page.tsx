import Link from "next/link";

import { ProfileEditor } from "@/components/profile-editor";
import { ProfileSection } from "@/components/sections";
import { SiteShell } from "@/components/site-shell";
import { WalletLinkPanel } from "@/components/wallet-link-panel";
import { getActiveBrandTheme } from "@/lib/brand-themes";
import { getBrandCopyProfile } from "@/lib/brand-copy";
import { getCampaignLaneVisualProfile, getCampaignPremiumJourney, getCampaignPremiumOffer } from "@/lib/campaign-source";
import { resolveCurrentSession } from "@/server/auth/current-user";
import { getCurrentProfile } from "@/server/services/profile-service";
import { loadDashboardOverview } from "@/server/services/platform-overview";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await resolveCurrentSession();
  const data = await loadDashboardOverview(session?.user ?? null);
  const profile = await getCurrentProfile();
  const walletCount = session?.walletAddresses.length ?? 0;
  const activeCampaignLane = data.economy.campaignPreset.source;
  const laneVisualProfile = getCampaignLaneVisualProfile(
    data.user.campaignSource ?? activeCampaignLane,
    activeCampaignLane,
    data.user.campaignSource,
  );
  const premiumOffer = getCampaignPremiumOffer(activeCampaignLane);
  const activeTheme = getActiveBrandTheme();
  const brandCopy = getBrandCopyProfile(activeTheme.id);
  const premiumJourney = getCampaignPremiumJourney(activeCampaignLane, {
    featuredTracks: data.economy.campaignPreset.featuredTracks,
    premiumUpsellMultiplier: data.economy.campaignPreset.premiumUpsellMultiplier,
    weeklyTargetOffset: data.economy.campaignPreset.weeklyTargetOffset,
  });

  return (
    <SiteShell eyebrow="Profile" currentUser={session?.user ?? null}>
      <section className="page-hero page-hero--profile">
        <div className={`panel panel--hero panel--hero-compact ${laneVisualProfile.themeClass}`}>
          <p className="eyebrow">Profile</p>
          <h2>Keep your account, wallet, and referrals ready for what comes next.</h2>
          <p className="lede">
            Keep your account details, wallet connection, and referral code up to date so everything works smoothly.
          </p>
          <div className="lane-chip-row">
            {laneVisualProfile.chips.map((chip) => (
              <span key={chip} className="badge">
                {chip}
              </span>
            ))}
          </div>
          <p className="form-note">{laneVisualProfile.emphasis}</p>
        </div>
        <div className="panel panel--stack page-aside">
          <div className="metric-card">
            <span>Connected wallets</span>
            <strong>{walletCount}</strong>
            <small>
              {walletCount > 0
                ? "Identity link is active."
                : `Attach ${brandCopy.walletProduct} to unlock the next mission gate.`}
            </small>
          </div>
          <div className="metric-card">
            <span>Current referral code</span>
            <strong>{data.user.referralCode}</strong>
            <small>Share this code to bring in new users, grow referral XP, and strengthen conversion quality.</small>
          </div>
          <div className="metric-card">
            <span>Current mode</span>
            <strong>{laneVisualProfile.label}</strong>
            <small>
              {data.user.campaignSource && data.user.campaignSource !== activeCampaignLane
                ? `${laneVisualProfile.emphasis} ${data.user.campaignSource} remains the source while ${activeCampaignLane} is shaping what you see right now.`
                : laneVisualProfile.emphasis}
            </small>
          </div>
          <div className="metric-card">
            <span>Premium path</span>
            <strong>{premiumOffer.title}</strong>
            <small>{premiumOffer.cta}</small>
          </div>
          <div className="metric-card">
            <span>Recommended next premium move</span>
            <strong>{premiumJourney.recommendedTier} first</strong>
            <small>{premiumJourney.nextAction}</small>
          </div>
        </div>
      </section>
      <ProfileSection data={data} />
      {session ? (
        <>
          {profile ? <ProfileEditor profile={profile} /> : null}
          <WalletLinkPanel
            walletAddresses={session.walletAddresses}
            activeMissionLabel={data.campaignPacks[0]?.label ?? null}
            activeMissionView="reward"
            walletProductLabel={brandCopy.walletProduct}
          />
        </>
      ) : (
        <section className="panel auth-panel panel--glass">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Wallet link</p>
              <h3>Sign in to manage your profile</h3>
            </div>
          </div>
          <p className="form-note">
            Wallet linking is available once you are signed in. Go to{" "}
            <Link href="/auth" className="text-link">
              the auth page
            </Link>{" "}
            to sign in or create an account.
          </p>
        </section>
      )}
    </SiteShell>
  );
}
