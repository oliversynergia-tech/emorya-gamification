"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import type { UserSnapshot } from "@/lib/types";

type AuthMode = "signin" | "signup";

type AuthResponse = {
  ok: boolean;
  error?: string;
};

export function AuthClientPanel({
  campaignSource,
  premiumOffer,
  premiumJourney,
}: {
  campaignSource?: UserSnapshot["campaignSource"];
  premiumOffer?: {
    title: string;
    summary: string;
    hooks: string[];
    cta: string;
  };
  premiumJourney?: {
    recommendedTier: "monthly" | "annual";
    nextAction: string;
    monthlyReason: string;
    annualReason: string;
    pathSteps: string[];
    lanePressure: string;
  };
}) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(campaignSource && campaignSource !== "direct" ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    setError(null);

    const endpoint = mode === "signin" ? "/api/auth/signin" : "/api/auth/signup";
    const payload = mode === "signin"
      ? { email, password }
      : { email, password, displayName, referralCode };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as AuthResponse;

      if (!response.ok || !result.ok) {
        setError(result.error ?? "Auth request failed.");
        return;
      }

      setMessage(mode === "signin" ? "Signed in successfully." : "Account created successfully.");
      if (typeof window !== "undefined") {
        window.localStorage.setItem("emorya-dashboard-mission-view", "active");
        window.localStorage.setItem("emorya-profile-mission-view", "active");
      }
      router.refresh();
      router.push("/dashboard#campaign-mission");
    } catch {
      setError("Unable to reach the auth service.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="panel auth-panel">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Account access</p>
          <h3>Email auth</h3>
        </div>
      </div>
      <div className="auth-toggle">
        <button
          type="button"
          className={`toggle-chip ${mode === "signin" ? "toggle-chip--active" : ""}`}
          onClick={() => setMode("signin")}
        >
          Sign in
        </button>
        <button
          type="button"
          className={`toggle-chip ${mode === "signup" ? "toggle-chip--active" : ""}`}
          onClick={() => setMode("signup")}
        >
          Sign up
        </button>
      </div>
      <form className="form-stack" onSubmit={handleSubmit}>
        {mode === "signup" ? (
          <>
            <label className="field">
              <span>Display name</span>
              <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required />
            </label>
            <label className="field">
              <span>Referral code</span>
              <input
                value={referralCode}
                onChange={(event) => setReferralCode(event.target.value.toUpperCase())}
                placeholder="Optional"
              />
            </label>
          </>
        ) : null}
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            required
          />
        </label>
        <button type="submit" className="button button--primary" disabled={pending}>
          {pending ? "Submitting..." : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>
      {message ? <p className="status status--success">{message}</p> : null}
      {message ? (
        <p className="mission-cue mission-cue--ready">
          <strong>Next quest ready</strong> Your mission flow will reopen on the active campaign view after sign-in.
        </p>
      ) : null}
      {error ? <p className="status status--error">{error}</p> : null}
      {premiumOffer ? (
        <div className="achievement-list">
          <article className="achievement-card lane-summary-card">
            <div>
              <strong>{premiumOffer.title}</strong>
              <p>{premiumOffer.summary}</p>
            </div>
            <span className="badge badge--pink">{campaignSource ?? "direct"}</span>
          </article>
          {premiumOffer.hooks.map((hook) => (
            <article key={hook} className="achievement-card">
              <div>
                <strong>Premium hook</strong>
                <p>{hook}</p>
              </div>
            </article>
          ))}
          {premiumJourney ? (
            <>
              <article className="achievement-card achievement-card--unlocked">
                <div>
                  <strong>Recommended first premium move</strong>
                  <p>{premiumJourney.nextAction}</p>
                </div>
                <span className="badge badge--pink">{premiumJourney.recommendedTier}</span>
              </article>
              <article className="achievement-card lane-pressure-card">
                <div>
                  <strong>Live lane pressure</strong>
                  <p>{premiumJourney.lanePressure}</p>
                </div>
              </article>
              <article className="achievement-card">
                <div>
                  <strong>Why monthly first</strong>
                  <p>{premiumJourney.monthlyReason}</p>
                </div>
              </article>
              <article className="achievement-card">
                <div>
                  <strong>Why annual later</strong>
                  <p>{premiumJourney.annualReason}</p>
                </div>
              </article>
            </>
          ) : null}
        </div>
      ) : null}
      <p className="form-note">
        Sign-up requires a password of at least 10 characters. Referral codes are optional, issue rewards to the inviter automatically, and feed into the monthly and annual premium reward path.
      </p>
      {premiumOffer ? <p className="form-note">{premiumOffer.cta}</p> : null}
    </section>
  );
}
