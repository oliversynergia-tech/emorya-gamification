import { AuthClientPanel } from "@/components/auth-client-panel";
import { SiteShell } from "@/components/site-shell";
import { WalletLinkPanel } from "@/components/wallet-link-panel";
import { resolveCurrentSession } from "@/server/auth/current-user";

export default async function AuthPage() {
  const session = await resolveCurrentSession();

  return (
    <SiteShell eyebrow="Account access" currentUser={session?.user ?? null}>
      <section className="grid grid--auth">
        <AuthClientPanel />
        {session ? (
          <WalletLinkPanel walletAddresses={session.walletAddresses} />
        ) : (
          <section className="panel auth-panel">
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
