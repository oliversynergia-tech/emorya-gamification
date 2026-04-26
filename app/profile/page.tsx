import { redirect } from "next/navigation";

import { PublicProfileShareButton } from "@/components/public-profile-share-button";
import { ProfileEditor } from "@/components/profile-editor";
import { ProfileSection } from "@/components/sections";
import { SiteShell } from "@/components/site-shell";
import { WalletLinkPanel } from "@/components/wallet-link-panel";
import { getActiveBrandTheme } from "@/lib/brand-themes";
import { getBrandCopyProfile } from "@/lib/brand-copy";
import { resolveCurrentSession } from "@/server/auth/current-user";
import { getCurrentProfile } from "@/server/services/profile-service";
import { loadDashboardOverview } from "@/server/services/platform-overview";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await resolveCurrentSession();

  if (!session) {
    redirect("/auth");
  }

  const data = await loadDashboardOverview(session.user);
  const profile = await getCurrentProfile();
  const walletCount = session.walletAddresses.length;
  const activeTheme = getActiveBrandTheme();
  const brandCopy = getBrandCopyProfile(activeTheme.id);
  const subscriptionLabel =
    data.user.tier === "annual"
      ? "Annual"
      : data.user.tier === "monthly"
        ? "Monthly"
        : "Free";
  const nextProfileStep =
    walletCount > 0
      ? "Your wallet is already linked. Head back to the dashboard and keep going."
      : `Connect ${brandCopy.walletProduct} when you are ready to unlock more quests and features.`;
  const appUrl = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://gravity.emorya.com").replace(/\/$/, "");
  const publicProfileUrl = `${appUrl}/u/${data.user.referralCode}`;

  return (
    <SiteShell eyebrow="Profile" currentUser={session.user}>
      <section className="page-hero page-hero--profile">
        <div className="panel panel--hero panel--hero-compact">
          <p className="eyebrow">Profile</p>
          <h1>Keep your account details, wallet, and invites ready to go.</h1>
          <p className="lede">
            Manage the essentials here so signing in, sharing your code, and picking up the next quest stays easy.
          </p>
          <div className="lane-chip-row">
            {["Update your details", "Connect your wallet", "Share your code"].map((chip) => (
              <span key={chip} className="badge">
                {chip}
              </span>
            ))}
          </div>
          <p className="form-note">A few quick updates here make the rest of the platform smoother to use.</p>
        </div>
        <div className="panel panel--stack page-aside">
          <div className="metric-card">
            <span>Connected wallets</span>
            <strong>{walletCount}</strong>
            <small>
              {walletCount > 0
                ? "Identity link is active."
                : `Attach ${brandCopy.walletProduct} when you are ready to unlock the next optional quest step.`}
            </small>
          </div>
          <div className="metric-card">
            <span>Current referral code</span>
            <strong>{data.user.referralCode}</strong>
            <small>Share this code with friends so they can join you and you can grow your referral progress together.</small>
            <PublicProfileShareButton profileUrl={publicProfileUrl} />
          </div>
          <div className="metric-card">
            <span>Membership</span>
            <strong>{subscriptionLabel}</strong>
            <small>
              {subscriptionLabel === "Free"
                ? "You can keep building progress for free and upgrade later if you want more."
                : `${subscriptionLabel} membership is active on this account.`}
            </small>
          </div>
          <div className="metric-card">
            <span>Best next step</span>
            <strong>{walletCount > 0 ? "Keep progressing" : "Connect your wallet"}</strong>
            <small>{nextProfileStep}</small>
          </div>
        </div>
      </section>
      <ProfileSection data={data} />
      {profile ? <ProfileEditor profile={profile} /> : null}
      <WalletLinkPanel
        walletAddresses={session.walletAddresses}
        activeMissionLabel={data.campaignPacks[0]?.label ?? null}
        activeMissionView="reward"
        walletProductLabel={brandCopy.walletProduct}
      />
    </SiteShell>
  );
}
