"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import type { ProfileData } from "@/lib/types";

export function ProfileEditor({ profile }: { profile: ProfileData }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? "");
  const [attributionSource, setAttributionSource] = useState(profile.attributionSource ?? "");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    setError(null);

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
          <p className="eyebrow">Profile editor</p>
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
            <strong>{profile.referralCode}</strong>
          </div>
        </div>
        <button type="submit" className="button button--primary" disabled={pending}>
          {pending ? "Saving..." : "Save profile"}
        </button>
      </form>
      {message ? <p className="status status--success">{message}</p> : null}
      {error ? <p className="status status--error">{error}</p> : null}
    </section>
  );
}
