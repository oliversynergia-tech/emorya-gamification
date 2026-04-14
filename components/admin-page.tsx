import { EconomySettingsPanel } from "@/components/economy-settings-panel";
import { ModerationNotificationHistoryPanel } from "@/components/moderation-notification-history-panel";
import { PayoutOperationsDashboard } from "@/components/payout-operations-dashboard";
import { PayoutAuditTrailPanel } from "@/components/payout-audit-trail-panel";
import { QuestDefinitionManagementPanel } from "@/components/quest-definition-management-panel";
import { QuestDefinitionToolingPanel } from "@/components/quest-definition-tooling-panel";
import { QuestVerificationShowcasePanel } from "@/components/quest-verification-showcase-panel";
import { RewardAssetsPanel } from "@/components/reward-assets-panel";
import { RewardProgramsPanel } from "@/components/reward-programs-panel";
import { AdminSection } from "@/components/sections";
import { RoleManagementPanel } from "@/components/role-management-panel";
import { ReviewQueuePanel } from "@/components/review-queue-panel";
import { SiteShell } from "@/components/site-shell";
import { TokenSettlementPanel } from "@/components/token-settlement-panel";
import { getTokenRedemptionPermissions, isAdminUser, isSuperAdminUser } from "@/server/auth/admin";
import { resolveCurrentSession } from "@/server/auth/current-user";
import { loadAdminOverview } from "@/server/services/platform-overview";

export async function AdminPageContent() {
  const session = await resolveCurrentSession();
  const hasAdminAccess = await isAdminUser(session?.user);
  const hasSuperAdminAccess = await isSuperAdminUser(session?.user);
  const payoutPermissions = await getTokenRedemptionPermissions(session?.user);

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
            This area now carries the same atmosphere as the player experience, while keeping the review queue
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
      <section className="panel panel--glass">
        <div className="review-bulk-actions">
          <a className="button button--secondary button--small" href="#payout-ops">
            Jump to payout ops
          </a>
          <a className="button button--secondary button--small" href="#campaign-ops">
            Jump to campaign ops
          </a>
          <a className="button button--secondary button--small" href="#access-ops">
            Jump to access and moderation
          </a>
        </div>
        <p className="form-note">
          The admin shell is now split into three working decks so campaign decisions and payout operations stop competing for the same attention.
        </p>
      </section>
      <AdminSection data={data} canManageCampaignPacks={hasAdminAccess} />
      <section className="admin-section-group" id="payout-ops">
        <div className="admin-section-group__header">
          <div>
            <p className="eyebrow">Payout operations deck</p>
            <h3>Control reward rails, queue health, and settlement decisions</h3>
          </div>
          <p className="form-note">
            This surface is now dedicated to payout risk and reward-rail operations, separate from campaign authoring and funnel performance.
          </p>
        </div>
        <div className="admin-focus-grid">
          <article className="admin-focus-card">
            <span>Highest leverage</span>
            <strong>Economy settings</strong>
            <small>Use this first when campaign economics or payout mode changes.</small>
          </article>
          <article className="admin-focus-card">
            <span>Operational risk</span>
            <strong>Settlement queue</strong>
            <small>Watch pending states, approvals, and receipt capture here.</small>
          </article>
          <article className="admin-focus-card">
            <span>Infrastructure</span>
            <strong>Reward assets and programs</strong>
            <small>Keep the payout rails clean before changing live reward behavior.</small>
          </article>
        </div>
        <EconomySettingsPanel
          initialSettings={data.economySettings}
          initialAudit={data.economySettingsAudit}
          canManage={hasSuperAdminAccess}
        />
        <div className="admin-dual-grid">
          <RewardAssetsPanel initialAssets={data.rewardAssets} canManage={hasSuperAdminAccess} />
          <RewardProgramsPanel
            initialPrograms={data.rewardPrograms}
            availableAssets={data.rewardAssets}
            canManage={hasSuperAdminAccess}
          />
        </div>
        <PayoutOperationsDashboard
          queue={data.tokenSettlementQueue}
          analytics={data.settlementAnalytics}
        />
        <TokenSettlementPanel
          initialQueue={data.tokenSettlementQueue}
          analytics={data.settlementAnalytics}
          payoutControls={data.economySettings}
          permissions={payoutPermissions}
        />
        <PayoutAuditTrailPanel entries={data.tokenSettlementAudit} />
        <ModerationNotificationHistoryPanel initialHistory={data.moderationNotificationHistory} />
      </section>

      <section className="admin-section-group" id="campaign-ops">
        <div className="admin-section-group__header">
          <div>
            <p className="eyebrow">Campaign operations deck</p>
            <h3>Manage templates, packs, live quest definitions, and funnel behavior</h3>
          </div>
          <p className="form-note">
            This surface is dedicated to bridge mode, pack lifecycle, template authoring, and campaign performance rather than payout handling.
          </p>
        </div>
        <QuestDefinitionToolingPanel />
        <QuestVerificationShowcasePanel questDefinitions={data.questDefinitionDirectory ?? []} />
        <QuestDefinitionManagementPanel
          availableAssets={data.rewardAssets}
          availablePrograms={data.rewardPrograms}
          initialTemplates={data.questDefinitionTemplates ?? []}
          differentiateUpstreamCampaignSources={data.economySettings.differentiateUpstreamCampaignSources}
        />
      </section>

      <section className="admin-section-group" id="access-ops">
        <div className="admin-section-group__header">
          <div>
            <p className="eyebrow">Access and moderation</p>
            <h3>Review content, assign roles, and manage queue throughput</h3>
          </div>
          <p className="form-note">
            Keep role changes rare and deliberate. The review queue should remain the main daily operating surface for admins.
          </p>
        </div>
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
      </section>
    </SiteShell>
  );
}
