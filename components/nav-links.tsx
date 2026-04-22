"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = {
  href: string;
  label: string;
};

export function NavLinks({
  items,
  className = "nav",
}: {
  items: NavItem[];
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <nav className={className} aria-label="Primary navigation">
      {items.map((item) => {
        const isActive = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`nav__link${isActive ? " nav__link--active" : ""}`}
            aria-current={isActive ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
