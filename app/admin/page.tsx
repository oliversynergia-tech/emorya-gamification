import { EconomySettingsPanel } from "@/components/economy-settings-panel";
import { ModerationNotificationHistoryPanel } from "@/components/moderation-notification-history-panel";
import { QuestDefinitionManagementPanel } from "@/components/quest-definition-management-panel";
import { QuestDefinitionToolingPanel } from "@/components/quest-definition-tooling-panel";
import { RewardAssetsPanel } from "@/components/reward-assets-panel";
import { RewardProgramsPanel } from "@/components/reward-programs-panel";
import { AdminSection } from "@/components/sections";
import { RoleManagementPanel } from "@/components/role-management-panel";
import { ReviewQueuePanel } from "@/components/review-queue-panel";
import { SiteShell } from "@/components/site-shell";
import { TokenSettlementPanel } from "@/components/token-settlement-panel";
import { isAdminUser, isSuperAdminUser } from "@/server/auth/admin";
import { resolveCurrentSession } from "@/server/auth/current-user";
import { loadAdminOverview } from "@/server/services/platform-overview";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await resolveCurrentSession();
  const hasAdminAccess = await isAdminUser(session?.user);
  const hasSuperAdminAccess = await isSuperAdminUser(session?.user);

  if (!session || !hasAdminAccess) {
    return (
      <SiteShell eyebrow="Admin controls" currentUser={session?.user ?? null}>
        <section className="page-hero page-hero--admin">
          <div className="panel panel--hero panel--hero-compact">
            <p className="eyebrow">Moderation layer</p>
            <h2>Admin surfaces now match the rest of the product shell, even when access is restricted.</h2>
            <p className="lede">
              Review actions, progression effects, and moderation notes sit behind database-backed role checks.
            </p>
          </div>
          <div className="panel panel--stack page-aside">
            <div className="metric-card">
              <span>Access model</span>
              <strong>Database roles</strong>
              <small>Admins can moderate. Super admins can also manage admin grants.</small>
            </div>
          </div>
        </section>
        <section className="panel panel--glass">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Restricted</p>
              <h3>Admin access required</h3>
            </div>
          </div>
          <p className="form-note">
            Sign in with an account that has the admin or super admin role to review submissions and access moderation data.
          </p>
        </section>
      </SiteShell>
    );
  }

  const data = await loadAdminOverview();

  return (
    <SiteShell eyebrow="Admin controls" currentUser={session?.user ?? null}>
      <section className="page-hero page-hero--admin">
        <div className="panel panel--hero panel--hero-compact">
          <p className="eyebrow">Operating view</p>
          <h2>Moderate quests, watch live progression effects, and steer campaign pressure from one control surface.</h2>
          <p className="lede">
            This area now carries the same Emorya atmosphere as the player experience, while keeping the review queue
            front and center.
          </p>
        </div>
        <div className="panel panel--stack page-aside">
          {data.stats.slice(0, 2).map((stat) => (
            <div key={stat.label} className="metric-card">
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
              <small>Live moderation and conversion context from PostgreSQL.</small>
            </div>
          ))}
        </div>
      </section>
      <AdminSection data={data} />
      <EconomySettingsPanel
        initialSettings={data.economySettings}
        initialAudit={data.economySettingsAudit}
        canManage={hasSuperAdminAccess}
      />
      <RewardAssetsPanel initialAssets={data.rewardAssets} canManage={hasSuperAdminAccess} />
      <RewardProgramsPanel
        initialPrograms={data.rewardPrograms}
        availableAssets={data.rewardAssets}
        canManage={hasSuperAdminAccess}
      />
      <TokenSettlementPanel
        initialQueue={data.tokenSettlementQueue}
        analytics={data.settlementAnalytics}
        payoutControls={data.economySettings}
      />
      <ModerationNotificationHistoryPanel initialHistory={data.moderationNotificationHistory} />
      <QuestDefinitionToolingPanel />
      <QuestDefinitionManagementPanel
        availableAssets={data.rewardAssets}
        availablePrograms={data.rewardPrograms}
        initialTemplates={data.questDefinitionTemplates ?? []}
        differentiateUpstreamCampaignSources={data.economySettings.differentiateUpstreamCampaignSources}
      />
      <RoleManagementPanel
        initialUsers={data.roleDirectory}
        initialAdmins={data.adminDirectory}
        canManageAdmins={hasSuperAdminAccess}
      />
      <ReviewQueuePanel
        initialQueue={data.reviewQueue}
        initialHistory={data.reviewHistory}
        isAuthenticated={hasAdminAccess}
        currentReviewerName={session.user.displayName}
      />
    </SiteShell>
  );
}
