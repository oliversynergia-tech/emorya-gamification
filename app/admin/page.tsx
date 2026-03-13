import { AdminSection } from "@/components/sections";
import { ReviewQueuePanel } from "@/components/review-queue-panel";
import { SiteShell } from "@/components/site-shell";
import { isAdminUser } from "@/server/auth/admin";
import { resolveCurrentSession } from "@/server/auth/current-user";
import { loadAdminOverview } from "@/server/services/platform-overview";

export default async function AdminPage() {
  const session = await resolveCurrentSession();
  const hasAdminAccess = isAdminUser(session?.user);

  if (!session || !hasAdminAccess) {
    return (
      <SiteShell eyebrow="Admin controls" currentUser={session?.user ?? null}>
        <section className="panel">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Restricted</p>
              <h3>Admin access required</h3>
            </div>
          </div>
          <p className="form-note">
            Sign in with an allowlisted admin account to review submissions and access moderation data.
          </p>
        </section>
      </SiteShell>
    );
  }

  const data = await loadAdminOverview();

  return (
    <SiteShell eyebrow="Admin controls" currentUser={session?.user ?? null}>
      <AdminSection data={data} />
      <ReviewQueuePanel initialQueue={data.reviewQueue} isAuthenticated={hasAdminAccess} />
    </SiteShell>
  );
}
