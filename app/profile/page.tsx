import Link from "next/link";

import { ProfileEditor } from "@/components/profile-editor";
import { ProfileSection } from "@/components/sections";
import { SiteShell } from "@/components/site-shell";
import { WalletLinkPanel } from "@/components/wallet-link-panel";
import { getCampaignPremiumOffer } from "@/lib/campaign-source";
import { resolveCurrentSession } from "@/server/auth/current-user";
import { getCurrentProfile } from "@/server/services/profile-service";
import { loadDashboardOverview } from "@/server/services/platform-overview";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await resolveCurrentSession();
  const data = await loadDashboardOverview(session?.user ?? null);
  const profile = await getCurrentProfile();
  const walletCount = session?.walletAddresses.length ?? 0;
  const premiumOffer = getCampaignPremiumOffer(data.user.campaignSource);

  return (
    <SiteShell eyebrow="Profile and social connections" currentUser={session?.user ?? null}>
      <section className="page-hero page-hero--profile">
        <div className="panel panel--hero panel--hero-compact">
          <p className="eyebrow">Identity surface</p>
          <h2>Shape the public face of your account, referral loop, and linked wallet access.</h2>
          <p className="lede">
            Profile, achievements, and wallet management now sit inside the same softer Emorya shell as the core
            dashboard, with the referral story visible beside your connection state.
          </p>
        </div>
        <div className="panel panel--stack page-aside">
          <div className="metric-card">
            <span>Connected wallets</span>
            <strong>{walletCount}</strong>
            <small>{walletCount > 0 ? "Identity link is active." : "Attach a wallet to unlock chain-aware quests."}</small>
          </div>
          <div className="metric-card">
            <span>Current referral code</span>
            <strong>{data.user.referralCode}</strong>
            <small>Share this code to grow invite XP and premium conversions.</small>
          </div>
          <div className="metric-card">
            <span>Premium path</span>
            <strong>{premiumOffer.title}</strong>
            <small>{premiumOffer.cta}</small>
          </div>
        </div>
      </section>
      <ProfileSection data={data} />
      {session ? (
        <>
          {profile ? <ProfileEditor profile={profile} /> : null}
          <WalletLinkPanel walletAddresses={session.walletAddresses} />
        </>
      ) : (
        <section className="panel auth-panel panel--glass">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Wallet link</p>
              <h3>Sign in to manage identities</h3>
            </div>
          </div>
          <p className="form-note">
            Wallet linking is available for signed-in users. Go to{" "}
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
