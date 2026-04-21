"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="route-state">
      <section className="panel panel--glass route-state__panel" role="alert">
        <p className="eyebrow">Something did not load</p>
        <h2>Refresh this step and keep going.</h2>
        <p className="lede">
          We could not load this part of your Emorya progress. Try again now, or come back in a moment if the network is
          still catching up.
        </p>
        <div className="hero__actions">
          <button type="button" className="button button--primary" onClick={reset}>
            Try again
          </button>
          <a className="button button--secondary" href="/dashboard">
            Go to dashboard
          </a>
        </div>
        {error.digest ? <p className="form-note">Reference: {error.digest}</p> : null}
      </section>
    </main>
  );
}
