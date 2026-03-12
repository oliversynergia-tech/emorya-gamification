import { NextResponse } from "next/server";

import { getAuthenticatedSession } from "@/server/services/auth-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAuthenticatedSession();

  return NextResponse.json({
    ok: true,
    authenticated: Boolean(session),
    user: session?.user ?? null,
    walletAddresses: session?.walletAddresses ?? [],
  });
}
