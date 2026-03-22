import type { Metadata } from "next";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { brandThemeCookieName, getBrandTheme, getBrandThemeStyleVariables } from "@/lib/brand-themes";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const activeBrandTheme = getBrandTheme(cookieStore.get(brandThemeCookieName)?.value ?? process.env.NEXT_PUBLIC_BRAND_THEME ?? process.env.BRAND_THEME);

  return {
    title: activeBrandTheme.brand.metadataTitle,
    description: activeBrandTheme.brand.metadataDescription,
  };
}

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const cookieStore = await cookies();
  const activeBrandTheme = getBrandTheme(cookieStore.get(brandThemeCookieName)?.value ?? process.env.NEXT_PUBLIC_BRAND_THEME ?? process.env.BRAND_THEME);

  return (
    <html lang="en">
      <body
        data-brand-theme={activeBrandTheme.id}
        style={getBrandThemeStyleVariables(activeBrandTheme)}
      >
        {children}
      </body>
    </html>
  );
}
