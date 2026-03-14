const supportedTracks = [
  "starter",
  "daily",
  "social",
  "wallet",
  "referral",
  "premium",
  "ambassador",
  "quiz",
  "creative",
  "campaign",
] as const;

const supportedRules = [
  "min_level",
  "wallet_linked",
  "starter_path_complete",
  "subscription_tier",
  "connected_social_count",
  "connected_social",
  "successful_referrals",
  "monthly_premium_referrals",
  "annual_premium_referrals",
  "ambassador_candidate",
  "ambassador_active",
  "campaign_source",
  "trust_score_band",
  "wallet_age_days",
  "quest_completed",
  "weekly_xp_min",
  "runtime_flag",
] as const;

const exampleMetadata = `{
  "track": "campaign",
  "targetUrl": "https://example.com/zealy-bridge",
  "unlockRules": {
    "all": [{ "type": "campaign_source", "value": "zealy" }]
  },
  "previewConfig": {
    "label": "Zealy Bridge",
    "desirability": 9
  },
  "rewardConfig": {
    "xp": { "base": 85, "premiumMultiplierEligible": true },
    "tokenEffect": "eligibility_progress",
    "tokenEligibility": { "progressPoints": 18 }
  }
}`;

export function QuestDefinitionToolingPanel() {
  return (
    <section className="panel panel--glass">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Quest authoring tooling</p>
          <h3>Structured metadata contract</h3>
        </div>
        <span className="badge badge--pink">Rules-engine ready</span>
      </div>
      <div className="info-grid">
        <div className="info-card">
          <span>Tracks</span>
          <strong>{supportedTracks.length}</strong>
        </div>
        <div className="info-card">
          <span>Unlock rules</span>
          <strong>{supportedRules.length}</strong>
        </div>
        <div className="info-card">
          <span>Reward shape</span>
          <strong>XP + token config</strong>
        </div>
        <div className="info-card">
          <span>Campaign support</span>
          <strong>Zealy / Galxe / Layer3</strong>
        </div>
      </div>
      <div className="tooling-grid">
        <article className="achievement-card">
          <div>
            <strong>Supported tracks</strong>
            <p>Use explicit `metadata.track` values so the rules engine does not fall back to slug inference.</p>
          </div>
          <div className="quest-card__meta quest-card__meta--wrap">
            {supportedTracks.map((track) => (
              <span key={track}>{track}</span>
            ))}
          </div>
        </article>
        <article className="achievement-card">
          <div>
            <strong>Supported unlock rules</strong>
            <p>Keep rule groups short and explicit, especially for premium, wallet, ambassador, and campaign quests.</p>
          </div>
          <div className="quest-card__meta quest-card__meta--wrap">
            {supportedRules.slice(0, 8).map((rule) => (
              <span key={rule}>{rule}</span>
            ))}
          </div>
        </article>
      </div>
      <div className="code-block">
        <p className="eyebrow">Example metadata</p>
        <pre>{exampleMetadata}</pre>
      </div>
      <p className="form-note">
        This panel is the safe authoring reference until full admin quest CRUD exists. Use the contract doc before
        editing SQL seed data or future quest-definition admin forms.
      </p>
    </section>
  );
}
