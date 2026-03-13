# Quest Definition Contract

This document defines the structured metadata shape expected for `quest_definitions.metadata`.

## Purpose

Quest definitions now drive:

- track grouping
- unlock evaluation
- reward projection
- locked preview hints
- token eligibility and direct-token reward previews
- campaign-source-specific onboarding lanes

New seeded quests and future admin-authored quests should follow this contract so the rules engine can evaluate them consistently.

## Required top-level quest fields

These remain first-class SQL columns:

- `slug`
- `title`
- `description`
- `category`
- `xp_reward`
- `difficulty`
- `verification_type`
- `required_level`
- `required_tier`
- `is_premium_preview`
- `recurrence`

## Structured metadata keys

### `track`

Allowed values:

- `starter`
- `daily`
- `social`
- `wallet`
- `referral`
- `premium`
- `ambassador`
- `quiz`
- `creative`
- `campaign`

Use this instead of relying on slug inference.

### `rewardConfig`

```json
{
  "xp": {
    "base": 90,
    "premiumMultiplierEligible": true
  },
  "tokenEffect": "eligibility_progress",
  "tokenEligibility": {
    "progressPoints": 18
  },
  "tokenBonus": {
    "multiplier": 1.2
  },
  "directTokenReward": {
    "asset": "EMR",
    "amount": 18,
    "requiresWallet": true
  },
  "referralBonus": {
    "xpBonus": 30,
    "tokenBonusMultiplier": 1.15
  }
}
```

Rules:

- `xp.base` should match the intended progression reward for the quest.
- `premiumMultiplierEligible` should be `true` unless the quest is intentionally fixed-reward.
- `tokenEffect` must be one of:
  - `none`
  - `eligibility_progress`
  - `token_bonus`
  - `direct_token_reward`
- `tokenEligibility.progressPoints` should be set for quests that move users toward redemption.
- `directTokenReward` should only be used for exceptional quests such as annual referral wins, flash reward days, and ambassador activations.

### `unlockRules`

```json
{
  "all": [
    { "type": "starter_path_complete", "value": true },
    { "type": "wallet_linked", "value": true },
    { "type": "min_level", "value": 5 }
  ],
  "any": [
    { "type": "campaign_source", "value": "zealy" }
  ]
}
```

Supported rule types in the current engine:

- `min_level`
- `wallet_linked`
- `starter_path_complete`
- `subscription_tier`
- `connected_social_count`
- `connected_social`
- `successful_referrals`
- `monthly_premium_referrals`
- `annual_premium_referrals`
- `ambassador_candidate`
- `ambassador_active`
- `campaign_source`
- `trust_score_band`
- `wallet_age_days`
- `quest_completed`
- `weekly_xp_min`
- `runtime_flag`

### `previewConfig`

```json
{
  "label": "Wallet Rewards",
  "desirability": 9
}
```

Use this for locked-preview positioning and card labeling.

### `targetUrl`

Optional CTA target for link-visit or educational quests.

### `timebox`

Optional string shown in the UI for flash windows or campaign countdown copy.

### Verification-specific keys

Examples:

- `passScore`
- `totalQuestions`
- `walletCheckMode`
- `requiredWalletPrefix`
- `requiredWalletAgeDays`
- `requiresReview`
- `cooldownHours`
- `requiresLinkedSocial`

## Recommended authoring rules

1. Always set `track`.
2. Prefer explicit `rewardConfig` over inferred token metadata.
3. Prefer explicit `unlockRules` for campaign, wallet, premium, and ambassador quests.
4. Keep `unlockRules.all` short. If a quest needs more than 4-5 gates, redesign the quest.
5. Use `directTokenReward` sparingly.
6. Use `eligibility_progress` for most token-path quests.
7. Keep `previewConfig.label` short and user-facing.

## Example quest definitions

### Campaign bridge quest

```json
{
  "track": "campaign",
  "targetUrl": "https://example.com/zealy-bridge",
  "unlockRules": {
    "all": [{ "type": "campaign_source", "value": "zealy" }]
  },
  "rewardConfig": {
    "xp": { "base": 85, "premiumMultiplierEligible": true },
    "tokenEffect": "eligibility_progress",
    "tokenEligibility": { "progressPoints": 18 }
  }
}
```

### Annual premium flash reward

```json
{
  "track": "premium",
  "timebox": "Flash reward day window",
  "unlockRules": {
    "all": [
      { "type": "subscription_tier", "value": "annual" },
      { "type": "successful_referrals", "value": 3 },
      { "type": "starter_path_complete", "value": true }
    ]
  },
  "rewardConfig": {
    "xp": { "base": 210, "premiumMultiplierEligible": true },
    "tokenEffect": "direct_token_reward",
    "directTokenReward": {
      "asset": "EMR",
      "amount": 18,
      "requiresWallet": true
    }
  }
}
```

## Token conversion mechanics

Current repo contract:

- token eligibility is accumulated via `rewardConfig.tokenEligibility.progressPoints`
- direct token campaign rewards are declared via `rewardConfig.directTokenReward`
- dashboard/profile now project conversion readiness using the current reward program:
  - minimum unlock: `100` eligibility points
  - base conversion: `20` points per `1 EMR`
  - tier multipliers:
    - free: `1.0x`
    - monthly: `1.15x`
    - annual: `1.3x`

These are product rules, not on-chain settlement logic.
