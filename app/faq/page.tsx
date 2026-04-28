import type { Metadata } from "next";
import Link from "next/link";

import { FaqAccordion } from "@/components/faq-accordion";
import { SiteShell } from "@/components/site-shell";
import { faqCategories, faqItems } from "@/lib/faq-content";
import { resolveCurrentSession } from "@/server/auth/current-user";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "FAQ - Emorya",
  description:
    "Answers to common questions about XP, quests, levels, streaks, referrals, wallets, and Premium on the Emorya gamification platform.",
  openGraph: {
    title: "FAQ - Emorya",
    description: "Answers to common questions about the Emorya gamification platform.",
    type: "website",
    url: `${process.env.APP_URL || "https://gravity.emorya.com"}/faq`,
  },
  twitter: {
    card: "summary",
    title: "FAQ - Emorya",
    description: "Answers to common questions about the Emorya gamification platform.",
  },
};

function getCategoryHref(category: string | null) {
  if (!category || category === "All") {
    return "/faq";
  }

  return `/faq?category=${encodeURIComponent(category)}`;
}

export default async function FaqPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await resolveCurrentSession();
  const params = searchParams ? await searchParams : {};
  const requestedCategory = Array.isArray(params.category) ? params.category[0] : params.category;
  const selectedCategory = requestedCategory && faqCategories.includes(requestedCategory) ? requestedCategory : "All";
  const visibleItems =
    selectedCategory === "All" ? faqItems : faqItems.filter((item) => item.category === selectedCategory);
  const groups = (selectedCategory === "All" ? faqCategories : [selectedCategory]).map((category) => ({
    category,
    items: visibleItems.filter((item) => item.category === category),
  }));

  return (
    <SiteShell eyebrow="Help" currentUser={session?.user ?? null}>
      <section className="page-hero faq-page">
        <div className="panel panel--hero panel--hero-compact faq-page__hero">
          <p className="eyebrow">Help and support</p>
          <h1>Frequently Asked Questions</h1>
          <p className="lede">Quick answers to the most common questions about the platform.</p>
        </div>
      </section>

      <section className="grid faq-page__section" aria-labelledby="faq-filter-title">
        <section className="panel panel--glass faq-filter-panel">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Browse by topic</p>
              <h2 id="faq-filter-title">Find the answer faster</h2>
            </div>
          </div>
          <nav className="public-leaderboard-tabs faq-filter-tabs" aria-label="FAQ categories">
            <Link
              href={getCategoryHref(null)}
              className={`public-leaderboard-tabs__link${selectedCategory === "All" ? " public-leaderboard-tabs__link--active" : ""}`}
              aria-current={selectedCategory === "All" ? "page" : undefined}
            >
              All
            </Link>
            {faqCategories.map((category) => (
              <Link
                key={category}
                href={getCategoryHref(category)}
                className={`public-leaderboard-tabs__link${selectedCategory === category ? " public-leaderboard-tabs__link--active" : ""}`}
                aria-current={selectedCategory === category ? "page" : undefined}
              >
                {category}
              </Link>
            ))}
          </nav>
        </section>
      </section>

      <section className="grid faq-page__section" aria-labelledby="faq-list-title">
        <div className="faq-page__content">
          <div className="panel panel--glass faq-page__intro">
            <div className="panel__header">
              <div>
                <p className="eyebrow">Answers at a glance</p>
                <h2 id="faq-list-title">
                  {selectedCategory === "All" ? "All questions" : `${selectedCategory} questions`}
                </h2>
              </div>
            </div>
            <p className="form-note">
              Everything here is public, so you can share a filtered FAQ link with anyone who needs context before signing up.
            </p>
          </div>
          <FaqAccordion groups={groups} />
        </div>
      </section>

      <section className="grid faq-page__section" aria-labelledby="faq-community-title">
        <section className="panel panel--glass landing-final-cta faq-community-cta">
          <p className="eyebrow">Still need a hand?</p>
          <h2 id="faq-community-title">Still have questions?</h2>
          <p className="lede">
            {session
              ? "Can't find what you're looking for? Reach out in Telegram or Discord."
              : "Join the Emorya community on Telegram or Discord and ask us directly."}
          </p>
          <div className="hero__actions">
            <Link
              className="button button--primary"
              href="https://t.me/EmoryaFinanceInternational"
              target="_blank"
              rel="noreferrer"
            >
              Telegram
            </Link>
            <Link
              className="button button--secondary"
              href="https://discord.com/invite/9Jrj7U9Y9R"
              target="_blank"
              rel="noreferrer"
            >
              Discord
            </Link>
          </div>
        </section>
      </section>
    </SiteShell>
  );
}
