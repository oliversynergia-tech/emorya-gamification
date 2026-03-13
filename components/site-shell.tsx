import Image from "next/image";
import Link from "next/link";
import { ReactNode } from "react";

import { SignOutButton } from "@/components/sign-out-button";
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

export function SiteShell({
  children,
  eyebrow = "Emorya Gamification Platform",
  currentUser = null,
}: {
  children: ReactNode;
  eyebrow?: string;
  currentUser?: AuthUser | null;
}) {
  return (
    <div className="shell">
      <div className="shell__glow shell__glow--left" />
      <div className="shell__glow shell__glow--right" />
      <header className="topbar">
        <div className="brand-block">
          <Link href="/" className="brand-link" aria-label="Emorya home">
            <Image
              className="brand-logo"
              src="https://emorya.com/_next/image?url=%2Ficons%2Flogo.png&w=640&q=100"
              alt="Emorya logo"
              width={52}
              height={52}
              unoptimized
            />
          </Link>
          <div className="brand-copy">
            <p className="eyebrow">{eyebrow}</p>
            <h1 className="brandmark">Healthy habits, real rewards</h1>
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
