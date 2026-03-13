import { getLevelProgress, getTierLabel, getTierMultiplier } from "@/lib/progression";
import { getQuestStatusLabel, getQuestStatusNote } from "@/lib/quest-state";
import type { AdminOverviewData, DashboardData, SubscriptionTier } from "@/lib/types";

function tierClass(tier: SubscriptionTier) {
  return `tier-pill tier-pill--${tier}`;
}

export function HeroSection({ data }: { data: DashboardData }) {
  const progress = getLevelProgress(data.user.totalXp);

  return (
    <section className="hero grid">
      <div className="panel panel--hero">
        <p className="eyebrow">Premium game loop for annual conversion</p>
        <h2>Guide users from first social quest to Annual Premium with a product-first quest system.</h2>
        <p className="lede">
          This fresh scaffold translates the brief into a dark luxury web app with onboarding,
          daily loops, visible premium ceilings, and admin control surfaces.
        </p>
        <div className="hero__actions">
          <a className="button button--primary" href="/dashboard">
            Open dashboard
          </a>
          <a className="button button--secondary" href="/admin">
            View admin panel
          </a>
        </div>
        <div className="stats-row">
          <div className="stat-card">
            <span>Primary goal</span>
            <strong>Annual Premium</strong>
          </div>
          <div className="stat-card">
            <span>User tier</span>
            <strong>{getTierLabel(data.user.tier)}</strong>
          </div>
          <div className="stat-card">
            <span>Time to next level</span>
            <strong>{progress.remainingXp} XP</strong>
          </div>
        </div>
      </div>
      <div className="panel panel--stack">
        <div className="metric-card">
          <span>Current streak</span>
          <strong>{data.user.currentStreak} days</strong>
          <small>Complete one quest today to keep it alive.</small>
        </div>
        <div className="metric-card">
          <span>XP multiplier</span>
          <strong>{getTierMultiplier(data.user.tier)}x</strong>
          <small>Annual doubles every verified action.</small>
        </div>
        <div className="metric-card">
          <span>Prize draw</span>
          <strong>294 days</strong>
          <small>Premium subscription required for entry.</small>
        </div>
      </div>
    </section>
  );
}

export function DashboardSnapshot({ data }: { data: DashboardData }) {
  const progress = getLevelProgress(data.user.totalXp);

  return (
    <section className="grid grid--dashboard">
      <div className="panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Player state</p>
            <h3>{data.user.displayName}</h3>
          </div>
          <span className={tierClass(data.user.tier)}>{getTierLabel(data.user.tier)}</span>
        </div>
        <div className="xp-meter">
          <div className="xp-meter__meta">
            <span>Level {progress.level}</span>
            <span>{data.user.totalXp} XP</span>
          </div>
          <div className="xp-meter__track">
            <div className="xp-meter__fill" style={{ width: `${progress.progress * 100}%` }} />
          </div>
          <small>{progress.remainingXp} XP to Level {progress.level + 1}</small>
        </div>
        <div className="info-grid">
          <div className="info-card">
            <span>Rank</span>
            <strong>#{data.user.rank}</strong>
          </div>
          <div className="info-card">
            <span>Referral code</span>
            <strong>{data.user.referralCode}</strong>
          </div>
          <div className="info-card">
            <span>Invited</span>
            <strong>{data.user.referral.invitedCount}</strong>
          </div>
          <div className="info-card">
            <span>Referral XP</span>
            <strong>{data.user.referral.rewardXpEarned}</strong>
          </div>
        </div>
        <div className="referral-summary">
          <div className="quest-card__meta">
            <span>{data.user.referral.convertedCount} converted</span>
            <span>{data.user.referral.pendingConversionXp} XP still available</span>
          </div>
          {data.user.referral.recentReferrals.length ? (
            <div className="referral-list">
              {data.user.referral.recentReferrals.map((referral) => (
                <article key={`${referral.displayName}-${referral.joinedAt}`} className="referral-item">
                  <div>
                    <strong>{referral.displayName}</strong>
                    <small>{referral.status === "converted" ? "Premium conversion" : "Joined with your code"}</small>
                  </div>
                  <span className={tierClass(referral.tier)}>{getTierLabel(referral.tier)}</span>
                </article>
              ))}
            </div>
          ) : (
            <small className="form-note">No referred users yet. Share your code to start the referral loop.</small>
          )}
        </div>
      </div>
      <div className="panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Featured quests</p>
            <h3>Today&apos;s loop</h3>
          </div>
          <span className="badge">Up to 155 XP</span>
        </div>
        <div className="quest-list">
          {data.quests.slice(0, 4).map((quest) => (
            <article
              key={quest.id}
              className={`quest-card quest-card--state-${quest.status}`}
            >
              <div>
                <div className="quest-card__meta">
                  <span>{quest.category}</span>
                  <span>{quest.difficulty}</span>
                </div>
                <h4>{quest.title}</h4>
                <p>{quest.description}</p>
                <small className="quest-card__note">{getQuestStatusNote(quest.status)}</small>
              </div>
              <div className="quest-card__footer">
                <span>{quest.xpReward} XP</span>
                <strong>{getQuestStatusLabel(quest.status)}</strong>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PremiumFunnelSection({ data }: { data: DashboardData }) {
  return (
    <section className="grid grid--funnel">
      <div className="panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Conversion architecture</p>
            <h3>Premium moments woven into progression</h3>
          </div>
          <span className="badge badge--pink">Save 44 EUR annually</span>
        </div>
        <div className="moment-list">
          {data.premiumMoments.map((moment) => (
            <div key={moment} className="moment-item">
              {moment}
            </div>
          ))}
        </div>
      </div>
      <div className="panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Tier ladder</p>
            <h3>Free to Annual</h3>
          </div>
        </div>
        <div className="tier-grid">
          <article className="tier-card">
            <span className={tierClass("free")}>Free</span>
            <strong>Levels 1-8</strong>
            <p>Habit building, social loops, quizzes, referrals, leaderboard visibility.</p>
          </article>
          <article className="tier-card">
            <span className={tierClass("monthly")}>Monthly</span>
            <strong>1.5x XP</strong>
            <p>Premium quests, subscriber leaderboard, raffle access, draw entry.</p>
          </article>
          <article className="tier-card">
            <span className={tierClass("annual")}>Annual</span>
            <strong>2x XP</strong>
            <p>Best badge, fastest leveling, exclusive quests, 3 streak freezes.</p>
          </article>
        </div>
      </div>
    </section>
  );
}

export function QuestBoardSection({ data }: { data: DashboardData }) {
  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Quest board</p>
          <h3>Mixed free, monthly, and annual visibility</h3>
        </div>
      </div>
      <div className="quest-grid">
        {data.quests.map((quest) => (
          <article
            key={quest.id}
            className={`quest-card quest-card--board quest-card--state-${quest.status} ${quest.status === "locked" ? "quest-card--locked" : ""}`}
          >
            <div className="quest-card__meta">
              <span>{quest.category}</span>
              <span>Lv {quest.requiredLevel}+</span>
            </div>
            <h4>{quest.title}</h4>
            <p>{quest.description}</p>
            <small className="quest-card__note">{getQuestStatusNote(quest.status)}</small>
            <div className="quest-card__footer">
              <span>{quest.xpReward} XP</span>
              <strong>
                {quest.status === "locked"
                  ? quest.requiredTier === "free"
                    ? "Locked"
                    : `${getTierLabel(quest.requiredTier)}`
                  : getQuestStatusLabel(quest.status)}
              </strong>
            </div>
            {quest.timebox ? <small>{quest.timebox}</small> : null}
          </article>
        ))}
      </div>
    </section>
  );
}

export function LeaderboardSection({ data }: { data: DashboardData }) {
  return (
    <section className="grid grid--leaderboard">
      <div className="panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">All-time leaderboard</p>
            <h3>Social proof and pressure</h3>
          </div>
          <span className="badge">Weekly reset Monday 00:00 UTC</span>
        </div>
        <div className="leaderboard">
          {data.leaderboard.map((entry) => (
            <div key={`${entry.rank}-${entry.displayName}`} className={`leaderboard__row leaderboard__row--${entry.tier}`}>
              <span>#{entry.rank}</span>
              <strong>{entry.displayName}</strong>
              <span>Lv {entry.level}</span>
              <span>{entry.xp.toLocaleString()} XP</span>
              <span>{entry.delta > 0 ? `+${entry.delta}` : entry.delta}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Live activity</p>
            <h3>The platform should feel active</h3>
          </div>
        </div>
        <div className="activity-list">
          {data.activityFeed.map((item) => (
            <article key={item.id} className="activity-item">
              <strong>{item.actor}</strong>
              <p>
                {item.action} <span>{item.detail}</span>
              </p>
              <small>{item.timeAgo}</small>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ProfileSection({ data }: { data: DashboardData }) {
  return (
    <section className="grid grid--profile">
      <div className="panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Profile</p>
            <h3>Identity and connected surfaces</h3>
          </div>
        </div>
        <div className="connections">
          {data.user.connectedAccounts.map((account) => (
            <div key={account.platform} className="connection-row">
              <div>
                <strong>{account.platform}</strong>
                <small>{account.connected ? "Connected" : `Connect for +${account.rewardXp} XP`}</small>
              </div>
              <span className={account.connected ? "connection-pill connection-pill--on" : "connection-pill"}>
                {account.connected ? "Live" : "Pending"}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Referral loop</p>
            <h3>Invite performance</h3>
          </div>
          <span className="badge">{data.user.referralCode}</span>
        </div>
        <div className="info-grid">
          <div className="info-card">
            <span>Invited</span>
            <strong>{data.user.referral.invitedCount}</strong>
          </div>
          <div className="info-card">
            <span>Converted</span>
            <strong>{data.user.referral.convertedCount}</strong>
          </div>
          <div className="info-card">
            <span>Reward XP</span>
            <strong>{data.user.referral.rewardXpEarned}</strong>
          </div>
          <div className="info-card">
            <span>Still available</span>
            <strong>{data.user.referral.pendingConversionXp}</strong>
          </div>
        </div>
      </div>
      <div className="panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Achievements</p>
            <h3>Prestige markers</h3>
          </div>
        </div>
        <div className="achievement-list">
          {data.achievements.map((achievement) => (
            <article key={achievement.id} className="achievement-card">
              <div>
                <strong>{achievement.name}</strong>
                <p>{achievement.description}</p>
              </div>
              <span>{achievement.unlocked ? "Unlocked" : `${Math.round(achievement.progress * 100)}%`}</span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function AdminSection({ data }: { data: AdminOverviewData }) {
  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Admin control surface</p>
          <h3>First-pass operating view</h3>
        </div>
      </div>
      <div className="stats-row">
        {data.stats.map((stat) => (
          <div key={stat.label} className="stat-card">
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </div>
        ))}
      </div>
      <div className="admin-grid">
        <article className="admin-card">
          <strong>Quest management</strong>
          <p>Publish social, learn, app, staking, referral, and limited-time quests with tier gates.</p>
        </article>
        <article className="admin-card">
          <strong>Review queue</strong>
          <p>Moderate screenshots, UGC, and social submissions with XP adjustments and featured status.</p>
        </article>
        <article className="admin-card">
          <strong>Analytics</strong>
          <p>Track free-to-monthly and monthly-to-annual funnel movement alongside quest completion.</p>
        </article>
      </div>
    </section>
  );
}
