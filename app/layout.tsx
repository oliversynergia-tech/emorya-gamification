import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getBrandThemeStyleVariables } from "@/lib/brand-themes";
import { resolveRuntimeBrandTheme } from "@/lib/brand-themes/server";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const activeBrandTheme = await resolveRuntimeBrandTheme();
  const metadataBase = new URL(process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://emorya.com");
  const ogImage = "/brand/emorya-og.svg";

  return {
    metadataBase,
    title: activeBrandTheme.brand.metadataTitle,
    description: activeBrandTheme.brand.metadataDescription,
    alternates: {
      canonical: "/",
    },
    openGraph: {
      title: activeBrandTheme.brand.metadataTitle,
      description: activeBrandTheme.brand.metadataDescription,
      url: "/",
      siteName: activeBrandTheme.brand.platformName,
      type: "website",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${activeBrandTheme.brand.platformName} quest progress preview`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: activeBrandTheme.brand.metadataTitle,
      description: activeBrandTheme.brand.metadataDescription,
      images: [ogImage],
    },
    icons: {
      icon: "/icon.svg",
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
