import Link from "next/link";
import { ReactNode } from "react";

const navItems = [
  { href: "/", label: "Overview" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/profile", label: "Profile" },
  { href: "/admin", label: "Admin" },
];

export function SiteShell({
  children,
  eyebrow = "Emorya Gamification Platform",
}: {
  children: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="shell">
      <div className="shell__glow shell__glow--left" />
      <div className="shell__glow shell__glow--right" />
      <header className="topbar">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="brandmark">Emorya</h1>
        </div>
        <nav className="nav">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="nav__link">
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="content">{children}</main>
    </div>
  );
}
