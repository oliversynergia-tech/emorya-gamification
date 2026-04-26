import Link from "next/link";

import { SiteShell } from "@/components/site-shell";
import { resolveCurrentSession } from "@/server/auth/current-user";

export default async function PublicProfileNotFound() {
  const session = await resolveCurrentSession();

  return (
    <SiteShell currentUser={session?.user ?? null}>
      <section className="grid landing-section" aria-labelledby="public-profile-not-found-title">
        <section className="panel panel--glass public-profile-not-found">
          <p className="eyebrow">Profile not found</p>
          <h1 id="public-profile-not-found-title">This profile doesn&apos;t exist. Want to create yours?</h1>
          <div className="hero__actions">
            <Link className="button button--primary" href="/auth">
              Get Started
            </Link>
          </div>
        </section>
      </section>
    </SiteShell>
  );
}
