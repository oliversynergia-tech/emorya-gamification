import Image from "next/image";
import Link from "next/link";
import { ReactNode } from "react";

import { type BrandThemeId } from "@/lib/brand-themes";
import { NavLinks } from "@/components/nav-links";
import { resolveRuntimeBrandTheme } from "@/lib/brand-themes/server";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import type { AuthUser } from "@/lib/types";
import { isAdminUser } from "@/server/auth/admin";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/achievements", label: "Achievements" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/profile", label: "Profile" },
];

export async function SiteShell({
  children,
  eyebrow,
  currentUser = null,
  hideAuthAction = false,
}: {
  children: ReactNode;
  eyebrow?: string;
  currentUser?: AuthUser | null;
  hideAuthAction?: boolean;
}) {
  const activeBrandTheme = await resolveRuntimeBrandTheme(currentUser);
  const showBrandCopy = activeBrandTheme.id === "emorya";
  const canSwitchThemes = await isAdminUser(currentUser);

  return (
    <div className="shell">
      <div className="shell__glow shell__glow--left" />
      <div className="shell__glow shell__glow--right" />
      <div className="shell__mesh" />
      <header className="topbar">
        <div className="brand-block">
          <Link href="/" className="brand-link" aria-label={activeBrandTheme.brand.homeAriaLabel}>
            <Image
              className="brand-logo"
              src={activeBrandTheme.brand.logoSrc}
              alt={activeBrandTheme.brand.logoAlt}
              width={activeBrandTheme.brand.logoWidth}
              height={activeBrandTheme.brand.logoHeight}
            />
          </Link>
          {showBrandCopy ? (
            <div className="brand-copy">
              <p className="eyebrow">{eyebrow ?? activeBrandTheme.brand.defaultEyebrow}</p>
              <h1 className="brandmark">{activeBrandTheme.brand.defaultTagline}</h1>
            </div>
          ) : null}
        </div>
        <div className="topbar__controls topbar__controls--desktop">
          <NavLinks items={navItems} />
          {canSwitchThemes ? <ThemeSwitcher activeTheme={activeBrandTheme.id as BrandThemeId} /> : null}
          <div className={`session-chip${!currentUser && hideAuthAction ? " session-chip--hidden" : ""}`}>
            {currentUser ? (
              <>
                <div>
                  <strong>{currentUser.displayName}</strong>
                  <small>{currentUser.email ?? "Wallet-only account"}</small>
                </div>
                <SignOutButton />
              </>
            ) : (
              <Link href="/auth" className="button button--secondary">
                Sign in
              </Link>
            )}
          </div>
        </div>
        <details className="mobile-nav">
          <summary className="mobile-nav__summary">
            <span>Menu</span>
            <span aria-hidden="true">+</span>
          </summary>
          <div className="mobile-nav__panel">
            <NavLinks items={navItems} className="mobile-nav__links" />
            {canSwitchThemes ? <ThemeSwitcher activeTheme={activeBrandTheme.id as BrandThemeId} /> : null}
            <div className={`session-chip${!currentUser && hideAuthAction ? " session-chip--hidden" : ""}`}>
              {currentUser ? (
                <>
                  <div>
                    <strong>{currentUser.displayName}</strong>
                    <small>{currentUser.email ?? "Wallet-only account"}</small>
                  </div>
                  <SignOutButton />
                </>
              ) : (
                <Link href="/auth" className="button button--secondary">
                  Sign in
                </Link>
              )}
            </div>
          </div>
        </details>
      </header>
      <main className="content">{children}</main>
    </div>
  );
}
