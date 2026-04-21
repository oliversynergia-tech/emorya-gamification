export default function Loading() {
  return (
    <main className="route-state" aria-busy="true" aria-live="polite">
      <section className="panel panel--glass route-state__panel">
        <p className="eyebrow">Loading Emorya</p>
        <h2>Getting your progress ready.</h2>
        <p className="lede">Your quests, rewards, and leaderboard position are being refreshed.</p>
        <div className="route-state__skeleton" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </section>
    </main>
  );
}
