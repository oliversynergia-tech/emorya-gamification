import { redirect } from "next/navigation";

import { DashboardExperience } from "@/components/dashboard-experience";
import { SiteShell } from "@/components/site-shell";
import { onboardingHintWindowMs } from "@/lib/onboarding-hints";
import { resolveCurrentSession } from "@/server/auth/current-user";
import { loadDashboardOverview } from "@/server/services/platform-overview";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await resolveCurrentSession();

  if (!session) {
    redirect("/auth");
  }

  const data = await loadDashboardOverview(session.user);
  const isNewUser =
    Number.isFinite(Date.parse(data.user.createdAt)) &&
    Date.parse(data.user.createdAt) > Date.now() - onboardingHintWindowMs;

  return (
    <SiteShell eyebrow="Daily loop" currentUser={session.user}>
      <DashboardExperience
        initialData={data}
        isAuthenticated
        isNewUser={isNewUser}
        userId={session.user.id}
        walletAddresses={session.walletAddresses}
      />
    </SiteShell>
  );
}
