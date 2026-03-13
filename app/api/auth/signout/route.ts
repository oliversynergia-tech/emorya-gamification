import { NextResponse } from "next/server";

import { handleSignOutRequest } from "@/server/http/auth-handlers";
import { signOutCurrentSession } from "@/server/services/auth-service";

export async function POST() {
  const result = await handleSignOutRequest(signOutCurrentSession);

  return NextResponse.json(result.body, { status: result.status });
}
