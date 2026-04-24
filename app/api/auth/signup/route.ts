import { NextResponse } from "next/server";

import { handleSignUpRequest } from "@/server/http/auth-handlers";
import { signUpWithEmail } from "@/server/services/auth-service";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    email?: string;
    password?: string;
    displayName?: string;
    referralCode?: string;
    source?: string;
  };

  const result = await handleSignUpRequest(body, signUpWithEmail);

  return NextResponse.json(result.body, { status: result.status });
}
