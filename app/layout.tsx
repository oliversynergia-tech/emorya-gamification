import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getActiveBrandTheme, getBrandThemeStyleVariables } from "@/lib/brand-themes";
import "./globals.css";

const activeBrandTheme = getActiveBrandTheme();

export const metadata: Metadata = {
  title: activeBrandTheme.brand.metadataTitle,
  description: activeBrandTheme.brand.metadataDescription,
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
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
