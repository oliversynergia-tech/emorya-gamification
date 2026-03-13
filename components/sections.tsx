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
  const unlockedAchievements = data.achievements.filter((achievement) => achievement.unlocked);
  const upcomingAchievements = data.achievements
    .filter((achievement) => !achievement.unlocked)
    .sort((left, right) => right.progress - left.progress)
    .slice(0, 2);

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
          <div className="info-card">
            <span>Referral rank</span>
            <strong>#{data.user.referral.rank}</strong>
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
        <div className="achievement-spotlight">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Achievement spotlight</p>
              <h3>{unlockedAchievements.length} badges unlocked</h3>
            </div>
            <span className="badge badge--pink">Prestige</span>
          </div>
          <div className="achievement-grid">
            {unlockedAchievements.slice(0, 2).map((achievement) => (
              <article key={achievement.id} className="achievement-card achievement-card--unlocked">
                <div className="quest-card__meta">
                  <span>Unlocked</span>
                  <span>100%</span>
                </div>
                <strong>{achievement.name}</strong>
                <p>{achievement.description}</p>
              </article>
            ))}
            {upcomingAchievements.map((achievement) => (
              <article key={achievement.id} className="achievement-card achievement-card--progress">
                <div className="quest-card__meta">
                  <span>In progress</span>
                  <span>{Math.round(achievement.progress * 100)}%</span>
                </div>
                <strong>{achievement.name}</strong>
                <p>{achievement.description}</p>
                <div className="achievement-progress">
                  <div className="achievement-progress__fill" style={{ width: `${achievement.progress * 100}%` }} />
                </div>
              </article>
            ))}
          </div>
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
  const topReferralEntry = data.referralLeaderboard[0];

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
            <p className="eyebrow">Referral campaign</p>
            <h3>Who is converting the strongest invite loop</h3>
          </div>
          <span className="badge badge--pink">#{data.user.referral.rank} for you</span>
        </div>
        <div className="referral-campaign-card">
          <div className="quest-card__meta">
            <span>Current referral leader</span>
            <span>{topReferralEntry ? `${topReferralEntry.xp} XP` : "No referral XP yet"}</span>
          </div>
          <strong>{topReferralEntry ? topReferralEntry.displayName : "Campaign waiting for invites"}</strong>
          <p>
            Referral positions rank by earned invite XP first, then converted premium joins, so this board reflects actual conversion quality instead of raw sign-up volume.
          </p>
          <div className="info-grid">
            <div className="info-card">
              <span>Your referral rank</span>
              <strong>#{data.user.referral.rank}</strong>
            </div>
            <div className="info-card">
              <span>Converted joins</span>
              <strong>{data.user.referral.convertedCount}</strong>
            </div>
            <div className="info-card">
              <span>Earned referral XP</span>
              <strong>{data.user.referral.rewardXpEarned}</strong>
            </div>
            <div className="info-card">
              <span>Still available</span>
              <strong>{data.user.referral.pendingConversionXp}</strong>
            </div>
          </div>
        </div>
        <div className="leaderboard leaderboard--referral">
          {data.referralLeaderboard.map((entry) => (
            <div key={`referral-${entry.rank}-${entry.displayName}`} className={`leaderboard__row leaderboard__row--${entry.tier}`}>
              <span>#{entry.rank}</span>
              <strong>{entry.displayName}</strong>
              <span>Lv {entry.level}</span>
              <span>{entry.xp.toLocaleString()} referral XP</span>
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
  const unlockedAchievements = data.achievements.filter((achievement) => achievement.unlocked);
  const progressingAchievements = data.achievements
    .filter((achievement) => !achievement.unlocked)
    .sort((left, right) => right.progress - left.progress);

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
          <span className="badge">{unlockedAchievements.length} unlocked</span>
        </div>
        <div className="achievement-stack">
          <div className="achievement-group">
            <div className="quest-card__meta">
              <span>Unlocked badges</span>
              <span>{unlockedAchievements.length}</span>
            </div>
            <div className="achievement-list">
              {unlockedAchievements.map((achievement) => (
                <article key={achievement.id} className="achievement-card achievement-card--unlocked">
                  <div>
                    <strong>{achievement.name}</strong>
                    <p>{achievement.description}</p>
                  </div>
                  <span className="badge">Unlocked</span>
                </article>
              ))}
            </div>
          </div>
          <div className="achievement-group">
            <div className="quest-card__meta">
              <span>Closest next badges</span>
              <span>{progressingAchievements.length}</span>
            </div>
            <div className="achievement-list">
              {progressingAchievements.map((achievement) => (
                <article key={achievement.id} className="achievement-card achievement-card--progress">
                  <div>
                    <strong>{achievement.name}</strong>
                    <p>{achievement.description}</p>
                  </div>
                  <div className="achievement-card__side">
                    <span>{Math.round(achievement.progress * 100)}%</span>
                    <div className="achievement-progress">
                      <div
                        className="achievement-progress__fill"
                        style={{ width: `${achievement.progress * 100}%` }}
                      />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
          {!unlockedAchievements.length && !progressingAchievements.length ? (
            <p className="form-note">No achievements available yet.</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function AchievementsHubSection({ data }: { data: DashboardData }) {
  const unlockedAchievements = data.achievements.filter((achievement) => achievement.unlocked);
  const progressingAchievements = data.achievements
    .filter((achievement) => !achievement.unlocked)
    .sort((left, right) => right.progress - left.progress);
  const completionRate = data.achievements.length
    ? Math.round((unlockedAchievements.length / data.achievements.length) * 100)
    : 0;
  const nextAchievement = progressingAchievements[0] ?? null;

  return (
    <section className="grid grid--profile">
      <div className="panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Progress overview</p>
            <h3>Prestige at a glance</h3>
          </div>
          <span className="badge badge--pink">{completionRate}% complete</span>
        </div>
        <div className="info-grid">
          <div className="info-card">
            <span>Unlocked</span>
            <strong>{unlockedAchievements.length}</strong>
          </div>
          <div className="info-card">
            <span>Total badges</span>
            <strong>{data.achievements.length}</strong>
          </div>
          <div className="info-card">
            <span>Current streak</span>
            <strong>{data.user.currentStreak} days</strong>
          </div>
          <div className="info-card">
            <span>Current tier</span>
            <strong>{getTierLabel(data.user.tier)}</strong>
          </div>
        </div>
        {nextAchievement ? (
          <div className="achievement-spotlight">
            <div className="panel__header">
              <div>
                <p className="eyebrow">Closest next unlock</p>
                <h3>{nextAchievement.name}</h3>
              </div>
              <span className="badge">{Math.round(nextAchievement.progress * 100)}%</span>
            </div>
            <p>{nextAchievement.description}</p>
            <div className="achievement-progress">
              <div
                className="achievement-progress__fill"
                style={{ width: `${nextAchievement.progress * 100}%` }}
              />
            </div>
          </div>
        ) : (
          <p className="form-note">Every currently tracked achievement is unlocked.</p>
        )}
      </div>
      <div className="panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Unlocked badges</p>
            <h3>Your completed prestige markers</h3>
          </div>
        </div>
        <div className="achievement-list">
          {unlockedAchievements.length ? (
            unlockedAchievements.map((achievement) => (
              <article key={achievement.id} className="achievement-card achievement-card--unlocked">
                <div>
                  <strong>{achievement.name}</strong>
                  <p>{achievement.description}</p>
                </div>
                <span className="badge">Unlocked</span>
              </article>
            ))
          ) : (
            <p className="form-note">No unlocked badges yet. Keep pushing the quest loop.</p>
          )}
        </div>
      </div>
      <div className="panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">In progress</p>
            <h3>What to chase next</h3>
          </div>
        </div>
        <div className="achievement-list">
          {progressingAchievements.length ? (
            progressingAchievements.map((achievement) => (
              <article key={achievement.id} className="achievement-card achievement-card--progress">
                <div>
                  <strong>{achievement.name}</strong>
                  <p>{achievement.description}</p>
                </div>
                <div className="achievement-card__side">
                  <span>{Math.round(achievement.progress * 100)}%</span>
                  <div className="achievement-progress">
                    <div
                      className="achievement-progress__fill"
                      style={{ width: `${achievement.progress * 100}%` }}
                    />
                  </div>
                </div>
              </article>
            ))
          ) : (
            <p className="form-note">No active progress items right now.</p>
          )}
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
      <div className="panel panel--glass admin-analytics">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Referral analytics</p>
            <h3>Invite performance and premium conversion pull</h3>
          </div>
          <span className="badge badge--pink">{Math.round(data.referralAnalytics.conversionRate * 100)}% conversion</span>
        </div>
        <div className="info-grid">
          <div className="info-card">
            <span>Total invited</span>
            <strong>{data.referralAnalytics.invitedCount}</strong>
          </div>
          <div className="info-card">
            <span>Total converted</span>
            <strong>{data.referralAnalytics.convertedCount}</strong>
          </div>
          <div className="info-card">
            <span>Referral XP earned</span>
            <strong>{data.referralAnalytics.rewardXpEarned}</strong>
          </div>
          <div className="info-card">
            <span>Pending referral XP</span>
            <strong>{data.referralAnalytics.pendingConversionXp}</strong>
          </div>
        </div>
        <div className="achievement-list">
          {data.referralAnalytics.topReferrers.map((referrer) => (
            <article key={referrer.displayName} className="achievement-card">
              <div>
                <strong>{referrer.displayName}</strong>
                <p>
                  {referrer.invitedCount} invited, {referrer.convertedCount} converted
                </p>
              </div>
              <div className="achievement-card__side">
                <span className={tierClass(referrer.tier)}>{getTierLabel(referrer.tier)}</span>
                <strong>{referrer.rewardXpEarned} XP</strong>
              </div>
            </article>
          ))}
          {data.referralAnalytics.topReferrers.length === 0 ? (
            <p className="form-note">No referral activity has been recorded yet.</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
