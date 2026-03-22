"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { brandThemes, type BrandThemeId } from "@/lib/brand-themes";

export function ThemeSwitcher({ activeTheme }: { activeTheme: BrandThemeId }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTarget = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

  return (
    <div className="theme-switcher" aria-label="Theme selector">
      {Object.values(brandThemes).map((theme) => (
        <Link
          key={theme.id}
          href={`/api/theme?theme=${theme.id}&returnTo=${encodeURIComponent(currentTarget)}`}
          className={`theme-switcher__link ${theme.id === activeTheme ? "theme-switcher__link--active" : ""}`}
          prefetch={false}
        >
          {theme.label}
        </Link>
      ))}
    </div>
  );
}
