"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { AdminOverviewData, EconomySettings, SubscriptionTier, TokenAsset } from "@/lib/types";

type EconomySettingsResponse = {
  ok: boolean;
  error?: string;
  settings?: EconomySettings;
  audit?: AdminOverviewData["economySettingsAudit"];
};

type TierForm = Record<SubscriptionTier, number>;
type CampaignOverrideKey = "direct" | "zealy" | "galxe" | "taskon";

function parseNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function EconomySettingsPanel({
  initialSettings,
  initialAudit,
  canManage,
}: {
  initialSettings: EconomySettings;
  initialAudit: AdminOverviewData["economySettingsAudit"];
  canManage: boolean;
}) {
  const router = useRouter();
  const [settings, setSettings] = useState(initialSettings);
  const [audit, setAudit] = useState(initialAudit);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updateTierMultiplier<K extends "xpTierMultipliers" | "tokenTierMultipliers">(
    key: K,
    tier: SubscriptionTier,
    value: string,
  ) {
    setSettings((current) => ({
      ...current,
      [key]: {
        ...current[key],
        [tier]: parseNumber(value),
      } as TierForm,
    }));
  }

  function updateCampaignOverride(
    source: CampaignOverrideKey,
    key:
      | "signupBonusXp"
      | "monthlyConversionBonusXp"
      | "annualConversionBonusXp"
      | "annualDirectTokenBonus"
      | "questXpMultiplierBonus"
      | "eligibilityPointsMultiplierBonus"
      | "tokenYieldMultiplierBonus"
      | "minimumEligibilityPointsOffset"
      | "directTokenRewardBonus"
      | "weeklyTargetXpOffset"
      | "premiumUpsellBonusMultiplier"
      | "leaderboardMomentumBonus",
    value: string,
  ) {
    setSettings((current) => ({
      ...current,
      campaignOverrides: {
        ...current.campaignOverrides,
        [source]: {
          ...current.campaignOverrides[source],
          [key]: parseNumber(value),
        },
      },
    }));
  }

  async function save() {
    setPending(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/admin/economy-settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          payoutAsset: settings.payoutAsset,
          payoutMode: settings.payoutMode,
          redemptionEnabled: settings.redemptionEnabled,
          settlementProcessingEnabled: settings.settlementProcessingEnabled,
          directRewardQueueEnabled: settings.directRewardQueueEnabled,
          settlementNotesRequired: settings.settlementNotesRequired,
          directRewardsEnabled: settings.directRewardsEnabled,
          directAnnualReferralEnabled: settings.directAnnualReferralEnabled,
          directPremiumFlashEnabled: settings.directPremiumFlashEnabled,
          directAmbassadorEnabled: settings.directAmbassadorEnabled,
          differentiateUpstreamCampaignSources: settings.differentiateUpstreamCampaignSources,
          minimumEligibilityPoints: settings.minimumEligibilityPoints,
          pointsPerToken: settings.pointsPerToken,
          xpTierMultipliers: settings.xpTierMultipliers,
          tokenTierMultipliers: settings.tokenTierMultipliers,
          referralSignupBaseXp: settings.referralSignupBaseXp,
          referralMonthlyConversionBaseXp: settings.referralMonthlyConversionBaseXp,
          referralAnnualConversionBaseXp: settings.referralAnnualConversionBaseXp,
          annualReferralDirectTokenAmount: settings.annualReferralDirectTokenAmount,
          campaignOverrides: settings.campaignOverrides,
        }),
      });
      const result = (await response.json()) as EconomySettingsResponse;

      if (!response.ok || !result.ok || !result.settings || !result.audit) {
        setError(result.error ?? "Unable to save economy settings.");
        return;
      }

      setSettings(result.settings);
      setAudit(result.audit);
      setMessage("Economy settings updated.");
      router.refresh();
    } catch {
      setError("Unable to reach the economy settings service.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="panel panel--glass">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Economy controls</p>
          <h3>XP-first reward program settings</h3>
        </div>
        <span className="badge badge--pink">{settings.payoutAsset}</span>
      </div>
      {message ? <p className="form-note">{message}</p> : null}
      {error ? <p className="form-note form-note--error">{error}</p> : null}
      <div className="profile-grid">
        <label className="field">
          <span>Payout asset</span>
          <select
            disabled={!canManage || pending}
            value={settings.payoutAsset}
            onChange={(event) => setSettings((current) => ({ ...current, payoutAsset: event.target.value as TokenAsset }))}
          >
            {["EMR", "EGLD", "PARTNER"].map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Payout mode</span>
          <select
            disabled={!canManage || pending}
            value={settings.payoutMode}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                payoutMode: event.target.value as EconomySettings["payoutMode"],
              }))
            }
          >
            <option value="manual">manual</option>
            <option value="review_required">review_required</option>
            <option value="automation_ready">automation_ready</option>
          </select>
        </label>
        <label className="field">
          <span>Minimum eligibility points</span>
          <input
            disabled={!canManage || pending}
            type="number"
            value={settings.minimumEligibilityPoints}
            onChange={(event) => setSettings((current) => ({ ...current, minimumEligibilityPoints: parseNumber(event.target.value) }))}
          />
        </label>
        <label className="field">
          <span>Points per token</span>
          <input
            disabled={!canManage || pending}
            type="number"
            value={settings.pointsPerToken}
            onChange={(event) => setSettings((current) => ({ ...current, pointsPerToken: parseNumber(event.target.value) }))}
          />
        </label>
        <label className="field field--checkbox">
          <span>Redemption enabled</span>
          <input
            disabled={!canManage || pending}
            type="checkbox"
            checked={settings.redemptionEnabled}
            onChange={(event) => setSettings((current) => ({ ...current, redemptionEnabled: event.target.checked }))}
          />
        </label>
        <label className="field field--checkbox">
          <span>Settlement processing</span>
          <input
            disabled={!canManage || pending}
            type="checkbox"
            checked={settings.settlementProcessingEnabled}
            onChange={(event) =>
              setSettings((current) => ({ ...current, settlementProcessingEnabled: event.target.checked }))
            }
          />
        </label>
        <label className="field field--checkbox">
          <span>Direct reward queue</span>
          <input
            disabled={!canManage || pending}
            type="checkbox"
            checked={settings.directRewardQueueEnabled}
            onChange={(event) =>
              setSettings((current) => ({ ...current, directRewardQueueEnabled: event.target.checked }))
            }
          />
        </label>
        <label className="field field--checkbox">
          <span>Settlement notes required</span>
          <input
            disabled={!canManage || pending}
            type="checkbox"
            checked={settings.settlementNotesRequired}
            onChange={(event) =>
              setSettings((current) => ({ ...current, settlementNotesRequired: event.target.checked }))
            }
          />
        </label>
        <label className="field field--checkbox">
          <span>Run Galxe and TaskOn as separate live lanes</span>
          <input
            disabled={!canManage || pending}
            type="checkbox"
            checked={settings.differentiateUpstreamCampaignSources}
            onChange={(event) =>
              setSettings((current) => ({ ...current, differentiateUpstreamCampaignSources: event.target.checked }))
            }
          />
        </label>
      </div>
      <p className="form-note">
        {settings.differentiateUpstreamCampaignSources
          ? "Separate upstream differentiation is on. Galxe and TaskOn now drive their own live funnel behavior instead of being routed through the Zealy bridge."
          : "Separate upstream differentiation is off. Galxe and TaskOn attribution is preserved, but the live funnel is currently routed through the Zealy bridge by default."}
      </p>
      <div className="profile-grid">
        <label className="field">
          <span>Monthly XP multiplier</span>
          <input
            disabled={!canManage || pending}
            type="number"
            step="0.05"
            value={settings.xpTierMultipliers.monthly}
            onChange={(event) => updateTierMultiplier("xpTierMultipliers", "monthly", event.target.value)}
          />
        </label>
        <label className="field">
          <span>Annual XP multiplier</span>
          <input
            disabled={!canManage || pending}
            type="number"
            step="0.05"
            value={settings.xpTierMultipliers.annual}
            onChange={(event) => updateTierMultiplier("xpTierMultipliers", "annual", event.target.value)}
          />
        </label>
        <label className="field">
          <span>Monthly token multiplier</span>
          <input
            disabled={!canManage || pending}
            type="number"
            step="0.05"
            value={settings.tokenTierMultipliers.monthly}
            onChange={(event) => updateTierMultiplier("tokenTierMultipliers", "monthly", event.target.value)}
          />
        </label>
        <label className="field">
          <span>Annual token multiplier</span>
          <input
            disabled={!canManage || pending}
            type="number"
            step="0.05"
            value={settings.tokenTierMultipliers.annual}
            onChange={(event) => updateTierMultiplier("tokenTierMultipliers", "annual", event.target.value)}
          />
        </label>
      </div>
      <div className="profile-grid">
        <label className="field">
          <span>Referral signup XP</span>
          <input
            disabled={!canManage || pending}
            type="number"
            value={settings.referralSignupBaseXp}
            onChange={(event) => setSettings((current) => ({ ...current, referralSignupBaseXp: parseNumber(event.target.value) }))}
          />
        </label>
        <label className="field">
          <span>Monthly referral XP</span>
          <input
            disabled={!canManage || pending}
            type="number"
            value={settings.referralMonthlyConversionBaseXp}
            onChange={(event) => setSettings((current) => ({ ...current, referralMonthlyConversionBaseXp: parseNumber(event.target.value) }))}
          />
        </label>
        <label className="field">
          <span>Annual referral XP</span>
          <input
            disabled={!canManage || pending}
            type="number"
            value={settings.referralAnnualConversionBaseXp}
            onChange={(event) => setSettings((current) => ({ ...current, referralAnnualConversionBaseXp: parseNumber(event.target.value) }))}
          />
        </label>
        <label className="field">
          <span>Annual referral direct reward</span>
          <input
            disabled={!canManage || pending}
            type="number"
            step="0.01"
            value={settings.annualReferralDirectTokenAmount}
            onChange={(event) => setSettings((current) => ({ ...current, annualReferralDirectTokenAmount: parseNumber(event.target.value) }))}
          />
        </label>
      </div>
      <div className="achievement-list">
        {[
          ["Global direct rewards", settings.directRewardsEnabled, "Applies to direct-token quest payouts overall."],
          ["Annual referral direct rewards", settings.directAnnualReferralEnabled, "Controls direct token payouts for annual premium referrals."],
          ["Premium flash direct rewards", settings.directPremiumFlashEnabled, "Controls premium-track direct-token quest payouts."],
          ["Ambassador direct rewards", settings.directAmbassadorEnabled, "Controls ambassador and creator direct-token quest payouts."],
        ].map(([label, checked, detail], index) => (
          <article key={String(label)} className="achievement-card">
            <div>
              <strong>{label}</strong>
              <p>{detail}</p>
            </div>
            <div className="achievement-card__side">
              <input
                disabled={!canManage || pending}
                type="checkbox"
                checked={Boolean(checked)}
                onChange={(event) => {
                  const nextValue = event.target.checked;
                  setSettings((current) => ({
                    ...current,
                    [index === 0
                      ? "directRewardsEnabled"
                      : index === 1
                        ? "directAnnualReferralEnabled"
                        : index === 2
                          ? "directPremiumFlashEnabled"
                          : "directAmbassadorEnabled"]: nextValue,
                  }));
                }}
              />
            </div>
          </article>
        ))}
      </div>
      <section className="panel panel--glass">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Campaign overrides</p>
            <h3>Per-source funnel and reward presets</h3>
          </div>
        </div>
        <p className="form-note">
          `direct` and `zealy` are always live. `galxe` and `taskon` presets are kept here so they can either feed the Zealy bridge or be switched on as separate lanes instantly.
        </p>
        <div className="tooling-grid">
          {(["direct", "zealy", "galxe", "taskon"] as CampaignOverrideKey[]).map((source) => (
            <article key={source} className="achievement-card">
              <div>
                <strong>{source}</strong>
                <p>
                  {source === "galxe" || source === "taskon"
                    ? settings.differentiateUpstreamCampaignSources
                      ? "Adjust how this upstream platform currently runs its own live funnel, conversion pressure, and reward economics."
                      : "Adjust the stored feeder-platform preset. These values are preserved now so the platform can be switched into a separate live lane later without another refactor."
                    : "Adjust how this live acquisition lane modifies signup, conversion, and direct-token referral rewards."}
                </p>
              </div>
              <div className="profile-grid">
                <label className="field">
                  <span>Signup bonus XP</span>
                  <input
                    disabled={!canManage || pending}
                    type="number"
                    value={settings.campaignOverrides[source].signupBonusXp}
                    onChange={(event) => updateCampaignOverride(source, "signupBonusXp", event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Monthly bonus XP</span>
                  <input
                    disabled={!canManage || pending}
                    type="number"
                    value={settings.campaignOverrides[source].monthlyConversionBonusXp}
                    onChange={(event) => updateCampaignOverride(source, "monthlyConversionBonusXp", event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Annual bonus XP</span>
                  <input
                    disabled={!canManage || pending}
                    type="number"
                    value={settings.campaignOverrides[source].annualConversionBonusXp}
                    onChange={(event) => updateCampaignOverride(source, "annualConversionBonusXp", event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Annual direct-token bonus</span>
                  <input
                    disabled={!canManage || pending}
                    type="number"
                    step="0.01"
                    value={settings.campaignOverrides[source].annualDirectTokenBonus}
                    onChange={(event) => updateCampaignOverride(source, "annualDirectTokenBonus", event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Quest XP multiplier bonus</span>
                  <input
                    disabled={!canManage || pending}
                    type="number"
                    step="0.01"
                    value={settings.campaignOverrides[source].questXpMultiplierBonus}
                    onChange={(event) => updateCampaignOverride(source, "questXpMultiplierBonus", event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Eligibility points bonus</span>
                  <input
                    disabled={!canManage || pending}
                    type="number"
                    step="0.01"
                    value={settings.campaignOverrides[source].eligibilityPointsMultiplierBonus}
                    onChange={(event) => updateCampaignOverride(source, "eligibilityPointsMultiplierBonus", event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Token yield bonus</span>
                  <input
                    disabled={!canManage || pending}
                    type="number"
                    step="0.01"
                    value={settings.campaignOverrides[source].tokenYieldMultiplierBonus}
                    onChange={(event) => updateCampaignOverride(source, "tokenYieldMultiplierBonus", event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Minimum-eligibility offset</span>
                  <input
                    disabled={!canManage || pending}
                    type="number"
                    value={settings.campaignOverrides[source].minimumEligibilityPointsOffset}
                    onChange={(event) => updateCampaignOverride(source, "minimumEligibilityPointsOffset", event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Direct reward bonus</span>
                  <input
                    disabled={!canManage || pending}
                    type="number"
                    step="0.01"
                    value={settings.campaignOverrides[source].directTokenRewardBonus}
                    onChange={(event) => updateCampaignOverride(source, "directTokenRewardBonus", event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Weekly target offset</span>
                  <input
                    disabled={!canManage || pending}
                    type="number"
                    value={settings.campaignOverrides[source].weeklyTargetXpOffset}
                    onChange={(event) => updateCampaignOverride(source, "weeklyTargetXpOffset", event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Premium upsell boost</span>
                  <input
                    disabled={!canManage || pending}
                    type="number"
                    step="0.01"
                    value={settings.campaignOverrides[source].premiumUpsellBonusMultiplier}
                    onChange={(event) => updateCampaignOverride(source, "premiumUpsellBonusMultiplier", event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Leaderboard momentum boost</span>
                  <input
                    disabled={!canManage || pending}
                    type="number"
                    step="0.01"
                    value={settings.campaignOverrides[source].leaderboardMomentumBonus}
                    onChange={(event) => updateCampaignOverride(source, "leaderboardMomentumBonus", event.target.value)}
                  />
                </label>
              </div>
            </article>
          ))}
        </div>
      </section>
      <div className="review-bulk-actions">
        <button className="button button--primary button--small" type="button" disabled={!canManage || pending} onClick={save}>
          {pending ? "Saving..." : "Save economy settings"}
        </button>
        <p className="form-note">
          {canManage
            ? "XP remains the main progression system. These controls only govern how premium, referrals, token eligibility, and direct-token overlays behave."
            : "Only super admins can change reward-economy settings."}
        </p>
      </div>
      <div className="achievement-list">
        {audit.map((entry) => (
          <article key={entry.id} className="achievement-card">
            <div>
              <strong>{entry.summary}</strong>
              <p>{entry.changedByDisplayName ?? "System"} updated the active program.</p>
            </div>
            <div className="achievement-card__side">
              <span>{new Date(entry.createdAt).toLocaleString()}</span>
            </div>
          </article>
        ))}
        {audit.length === 0 ? <p className="form-note">No economy setting changes recorded yet.</p> : null}
      </div>
    </section>
  );
}
