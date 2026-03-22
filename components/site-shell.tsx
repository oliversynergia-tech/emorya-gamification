import Image from "next/image";
import { cookies } from "next/headers";
import Link from "next/link";
import { ReactNode } from "react";

import { brandThemeCookieName, getBrandTheme, type BrandThemeId } from "@/lib/brand-themes";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import type { AuthUser } from "@/lib/types";

const navItems = [
  { href: "/", label: "Overview" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/achievements", label: "Achievements" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/profile", label: "Profile" },
  { href: "/auth", label: "Auth" },
  { href: "/admin", label: "Admin" },
];

export async function SiteShell({
  children,
  eyebrow,
  currentUser = null,
}: {
  children: ReactNode;
  eyebrow?: string;
  currentUser?: AuthUser | null;
}) {
  const cookieStore = await cookies();
  const activeBrandTheme = getBrandTheme(cookieStore.get(brandThemeCookieName)?.value ?? process.env.NEXT_PUBLIC_BRAND_THEME ?? process.env.BRAND_THEME);

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
          <div className="brand-copy">
            <p className="eyebrow">{eyebrow ?? activeBrandTheme.brand.defaultEyebrow}</p>
            <h1 className="brandmark">{activeBrandTheme.brand.defaultTagline}</h1>
          </div>
        </div>
        <div className="topbar__controls">
          <nav className="nav">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="nav__link">
                {item.label}
              </Link>
            ))}
          </nav>
          <ThemeSwitcher activeTheme={activeBrandTheme.id as BrandThemeId} />
          <div className="session-chip">
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
      </header>
      <main className="content">{children}</main>
    </div>
  );
}
