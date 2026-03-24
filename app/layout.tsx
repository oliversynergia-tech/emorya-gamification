import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getBrandThemeStyleVariables } from "@/lib/brand-themes";
import { resolveRuntimeBrandTheme } from "@/lib/brand-themes/server";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const activeBrandTheme = await resolveRuntimeBrandTheme();

  return {
    title: activeBrandTheme.brand.metadataTitle,
    description: activeBrandTheme.brand.metadataDescription,
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
