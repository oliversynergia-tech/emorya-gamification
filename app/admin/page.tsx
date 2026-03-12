import { AdminSection } from "@/components/sections";
import { ReviewQueuePanel } from "@/components/review-queue-panel";
import { SiteShell } from "@/components/site-shell";
import { resolveCurrentSession } from "@/server/auth/current-user";
import { loadAdminOverview } from "@/server/services/platform-overview";

export default async function AdminPage() {
  const data = await loadAdminOverview();
  const session = await resolveCurrentSession();

  return (
    <SiteShell eyebrow="Admin controls" currentUser={session?.user ?? null}>
      <AdminSection data={data} />
      <ReviewQueuePanel initialQueue={data.reviewQueue} isAuthenticated={Boolean(session)} />
    </SiteShell>
  );
}
