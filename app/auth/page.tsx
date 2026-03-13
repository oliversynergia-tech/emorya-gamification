import { AuthClientPanel } from "@/components/auth-client-panel";
import { SiteShell } from "@/components/site-shell";
import { WalletLinkPanel } from "@/components/wallet-link-panel";
import { resolveCurrentSession } from "@/server/auth/current-user";

export default async function AuthPage() {
  const session = await resolveCurrentSession();

  return (
    <SiteShell eyebrow="Account access" currentUser={session?.user ?? null}>
      <section className="page-hero page-hero--auth">
        <div className="panel panel--hero panel--hero-compact">
          <p className="eyebrow">Identity stack</p>
          <h2>Bring email, wallet, and referral identity into one Emorya account.</h2>
          <p className="lede">
            This is the entry point for account creation, return access, and MultiversX linking. The experience now
            mirrors the same premium shell used across the dashboard.
          </p>
          <div className="hero__actions">
            <a className="button button--primary" href="#auth-panel">
              Open auth form
            </a>
            <a className="button button--secondary" href="/dashboard">
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
        </div>
      </section>
      <section className="grid grid--auth">
        <div id="auth-panel">
          <AuthClientPanel />
        </div>
        {session ? (
          <WalletLinkPanel walletAddresses={session.walletAddresses} />
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
