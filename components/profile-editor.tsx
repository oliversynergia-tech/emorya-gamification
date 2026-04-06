"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { defaultBrandThemeId } from "@/lib/brand-themes";
import { getBrandCopyProfile, getBrandDisplayReferralCode } from "@/lib/brand-copy";
import { defaultConnectionRewards, socialPlatformMeta, validateSocialHandle } from "@/lib/social-platforms";
import type { ProfileData, SocialConnectionState } from "@/lib/types";

export function ProfileEditor({ profile }: { profile: ProfileData }) {
  const router = useRouter();
  const activeThemeId = typeof document !== "undefined" ? document.body.dataset.brandTheme ?? defaultBrandThemeId : defaultBrandThemeId;
  const brandCopy = getBrandCopyProfile(activeThemeId);
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? "");
  const [attributionSource, setAttributionSource] = useState(profile.attributionSource ?? "");
  const [socialConnections, setSocialConnections] = useState<SocialConnectionState[]>(profile.socialConnections);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updateConnection(platform: string, updates: Partial<SocialConnectionState>) {
    setSocialConnections((current) =>
      current.map((connection) =>
        connection.platform === platform
          ? { ...connection, ...updates }
          : connection,
      ),
    );
  }

  const connectionErrors = Object.fromEntries(
    socialConnections.map((connection) => {
      const platform = connection.platform as keyof typeof socialPlatformMeta;
      const validation = validateSocialHandle(platform, connection.handle ?? null);
      const missingVerifiedHandle =
        connection.verified && !validation.normalized
          ? `Add a ${connection.platform} handle before marking this connection live.`
          : null;

      return [connection.platform, missingVerifiedHandle ?? validation.error];
    }),
  ) as Record<string, string | null>;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    setError(null);

    const firstConnectionError = Object.values(connectionErrors).find(Boolean);

    if (firstConnectionError) {
      setError(firstConnectionError);
      setPending(false);
      return;
    }

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          displayName,
          avatarUrl,
          attributionSource,
          socialConnections,
        }),
      });

      const result = (await response.json()) as {
        ok: boolean;
        error?: string;
      };

      if (!response.ok || !result.ok) {
        setError(result.error ?? "Unable to update profile.");
        return;
      }

      setMessage("Profile updated.");
      router.refresh();
    } catch {
      setError("Unable to reach the profile service.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="panel auth-panel">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Profile settings</p>
          <h3>Edit your account</h3>
        </div>
      </div>
      <form className="form-stack" onSubmit={handleSubmit}>
        <label className="field">
          <span>Display name</span>
          <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required />
        </label>
        <label className="field">
          <span>Avatar URL</span>
          <input
            value={avatarUrl}
            onChange={(event) => setAvatarUrl(event.target.value)}
            placeholder="https://..."
          />
        </label>
        <label className="field">
          <span>Attribution source</span>
          <input
            value={attributionSource}
            onChange={(event) => setAttributionSource(event.target.value)}
            placeholder="zealy, social, organic, referral"
          />
        </label>
        <div className="profile-meta">
          <div className="info-card">
            <span>Email</span>
            <strong>{profile.email ?? "No email"}</strong>
          </div>
          <div className="info-card">
            <span>Tier</span>
            <strong>{profile.subscriptionTier}</strong>
          </div>
          <div className="info-card">
            <span>Referral code</span>
            <strong>{getBrandDisplayReferralCode(profile.referralCode)}</strong>
          </div>
        </div>
        <div className="panel panel--glass social-editor">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Connected accounts</p>
              <h3>Keep your public accounts up to date</h3>
            </div>
          </div>
          <div className="social-editor__list">
            {socialConnections.map((connection) => (
              <article key={connection.platform} className="social-editor__item">
                {(() => {
                  const platformMeta = socialPlatformMeta[connection.platform as keyof typeof socialPlatformMeta];
                  const validationError = connectionErrors[connection.platform];

                  return (
                    <>
                <div className="social-editor__meta">
                  <div>
                    <strong>{connection.platform}</strong>
                    <small>
                      {connection.verified
                        ? "Connected on your profile"
                        : `Mark as connected to reflect +${defaultConnectionRewards[connection.platform as keyof typeof defaultConnectionRewards] ?? 15} XP on the ${brandCopy.nativeLoop}`}
                    </small>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={connection.verified}
                      onChange={(event) =>
                        updateConnection(connection.platform, {
                          verified: event.target.checked,
                          connectedAt: event.target.checked
                            ? connection.connectedAt ?? new Date().toISOString()
                            : null,
                        })
                      }
                    />
                    <span>{connection.verified ? "Connected" : "Pending"}</span>
                  </label>
                </div>
                <label className="field">
                  <span>{connection.platform} handle</span>
                  <input
                    value={connection.handle ?? ""}
                    onChange={(event) =>
                      updateConnection(connection.platform, {
                        handle: event.target.value,
                      })
                    }
                    placeholder={platformMeta.placeholder}
                  />
                </label>
                <p className="form-note">{platformMeta.hint}</p>
                {validationError ? <p className="status status--error">{validationError}</p> : null}
                    </>
                  );
                })()}
              </article>
            ))}
          </div>
        </div>
        <button type="submit" className="button button--primary" disabled={pending}>
          {pending ? "Saving..." : "Save profile"}
        </button>
      </form>
      {message ? <p className="status status--success">{message}</p> : null}
      {message ? (
        <div className="achievement-card achievement-card--progress">
          <div>
            <strong>Account changes saved</strong>
            <p>Your main views will reopen with the same context, so you can jump straight back into the right next step.</p>
            <p className="mission-cue mission-cue--planning">
              <strong>Review what is next</strong> Recheck your active journey now that your account details are up to date.
            </p>
          </div>
          <div className="achievement-card__side">
            <a
              className="text-link"
              href="/dashboard#campaign-mission"
              onClick={() => {
                if (typeof window !== "undefined") {
                  const missionView = window.localStorage.getItem("emorya-dashboard-mission-view") ?? "active";
                  window.localStorage.setItem("emorya-dashboard-mission-view", missionView);
                }
              }}
            >
              Return to dashboard
            </a>
            <a
              className="text-link"
              href="#mission-recap"
              onClick={() => {
                if (typeof window !== "undefined") {
                  const missionView = window.localStorage.getItem("emorya-profile-mission-view") ?? "active";
                  window.localStorage.setItem("emorya-profile-mission-view", missionView);
                }
              }}
            >
              Review profile recap
            </a>
          </div>
        </div>
      ) : null}
      {error ? <p className="status status--error">{error}</p> : null}
    </section>
  );
}
