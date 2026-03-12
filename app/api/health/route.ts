import { NextResponse } from "next/server";

import { getMissingRequiredEnv } from "@/lib/config";

export async function GET() {
  const missingEnv = getMissingRequiredEnv();

  return NextResponse.json({
    ok: missingEnv.length === 0,
    app: "emorya-gamification",
    architecture: {
      frontend: "next-app-router",
      backend: "next-route-handlers",
      database: "postgresql",
      auth: ["email-password", "multiversx-wallet-linking"],
      sessions: "signed-http-only-cookies",
    },
    env: {
      missingRequired: missingEnv,
    },
  });
}
