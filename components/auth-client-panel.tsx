"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type AuthMode = "signin" | "signup";

type AuthResponse = {
  ok: boolean;
  error?: string;
};

export function AuthClientPanel({
  initialReferralCode = "",
  initialAttributionSource = "",
  initialMode = "signin",
}: {
  initialReferralCode?: string;
  initialAttributionSource?: string;
  initialMode?: AuthMode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [referralCode, setReferralCode] = useState(initialReferralCode.toUpperCase());
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const attributionSource = searchParams.get("source")?.trim().toLowerCase() ?? initialAttributionSource;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    setError(null);

    const endpoint = mode === "signin" ? "/api/auth/signin" : "/api/auth/signup";
    const payload = mode === "signin"
      ? { email, password }
      : { email, password, displayName, referralCode, source: attributionSource };

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
      const shouldShowReferralWelcome =
        mode === "signup" &&
        referralCode.trim().length > 0;
      router.push(shouldShowReferralWelcome ? "/welcome" : "/dashboard#campaign-mission");
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
          <h3>Email sign in</h3>
        </div>
      </div>
      <div className="auth-toggle" role="group" aria-label="Choose account access mode">
        <button
          type="button"
          className={`toggle-chip ${mode === "signin" ? "toggle-chip--active" : ""}`}
          onClick={() => setMode("signin")}
          aria-pressed={mode === "signin"}
        >
          Sign in
        </button>
        <button
          type="button"
          className={`toggle-chip ${mode === "signup" ? "toggle-chip--active" : ""}`}
          onClick={() => setMode("signup")}
          aria-pressed={mode === "signup"}
        >
          Sign up
        </button>
      </div>
      <form className="form-stack" onSubmit={handleSubmit}>
        {mode === "signup" ? (
          <>
            {initialReferralCode ? (
              <p className="status status--success" role="status" aria-live="polite">
                Invite code applied. Create your account to join through this referral.
              </p>
            ) : null}
            {attributionSource ? (
              <p className="status status--success" role="status" aria-live="polite">
                Campaign source detected. Your account will be created with this onboarding source.
              </p>
            ) : null}
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
      {message ? <p className="status status--success" role="status" aria-live="polite">{message}</p> : null}
      {message ? (
        <p className="mission-cue mission-cue--ready">
          <strong>You&apos;re in</strong> Your dashboard will open with the best next step ready for you.
        </p>
      ) : null}
      {error ? <p className="status status--error" role="alert">{error}</p> : null}
      <div className="achievement-list">
        <article className="achievement-card">
          <div>
            <strong>Premium is optional</strong>
            <p>Start for free, build your routine, and upgrade later if you want faster progress and stronger rewards.</p>
          </div>
        </article>
        <article className="achievement-card achievement-card--unlocked">
          <div>
            <strong>Best first upgrade</strong>
            <p>Monthly is the best first step if you want more from the experience.</p>
          </div>
          <span className="badge badge--pink">monthly</span>
        </article>
        <article className="achievement-card">
          <div>
            <strong>Why monthly first</strong>
            <p>Monthly is the easier first step if you want stronger progress without making a bigger commitment yet.</p>
          </div>
        </article>
        <article className="achievement-card">
          <div>
            <strong>Why annual later</strong>
            <p>Annual makes more sense once you know you want the full version of the experience for the long term.</p>
          </div>
        </article>
      </div>
      <p className="form-note">
        Sign-up requires a password of at least 10 characters. Referral codes are optional.
      </p>
      <p className="form-note">You can always start free and decide about premium later.</p>
    </section>
  );
}
