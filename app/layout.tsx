import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getBrandThemeStyleVariables } from "@/lib/brand-themes";
import { resolveRuntimeBrandTheme } from "@/lib/brand-themes/server";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const activeBrandTheme = await resolveRuntimeBrandTheme();
  const metadataBase = new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://emorya.com");

  return {
    metadataBase,
    title: activeBrandTheme.brand.metadataTitle,
    description: activeBrandTheme.brand.metadataDescription,
    openGraph: {
      title: activeBrandTheme.brand.metadataTitle,
      description: activeBrandTheme.brand.metadataDescription,
      url: "/",
      siteName: activeBrandTheme.brand.platformName,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: activeBrandTheme.brand.metadataTitle,
      description: activeBrandTheme.brand.metadataDescription,
    },
  };
}

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const activeBrandTheme = await resolveRuntimeBrandTheme();

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
