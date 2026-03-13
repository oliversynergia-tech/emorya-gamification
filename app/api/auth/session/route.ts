import { NextResponse } from "next/server";

import { handleSessionLookupRequest } from "@/server/http/auth-handlers";
import { getAuthenticatedSession } from "@/server/services/auth-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await handleSessionLookupRequest(getAuthenticatedSession);

  return NextResponse.json(result.body, { status: result.status });
}
