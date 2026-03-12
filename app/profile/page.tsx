import Link from "next/link";

import { ProfileEditor } from "@/components/profile-editor";
import { ProfileSection } from "@/components/sections";
import { SiteShell } from "@/components/site-shell";
import { WalletLinkPanel } from "@/components/wallet-link-panel";
import { resolveCurrentSession } from "@/server/auth/current-user";
import { getCurrentProfile } from "@/server/services/profile-service";
import { loadDashboardOverview } from "@/server/services/platform-overview";

export default async function ProfilePage() {
  const session = await resolveCurrentSession();
  const data = await loadDashboardOverview(session?.user ?? null);
  const profile = await getCurrentProfile();

  return (
    <SiteShell eyebrow="Profile and social connections" currentUser={session?.user ?? null}>
      <ProfileSection data={data} />
      {session ? (
        <>
          {profile ? <ProfileEditor profile={profile} /> : null}
          <WalletLinkPanel walletAddresses={session.walletAddresses} />
        </>
      ) : (
        <section className="panel auth-panel">
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
