import { NextResponse } from "next/server";

import { handleSignInRequest } from "@/server/http/auth-handlers";
import { signInWithEmail } from "@/server/services/auth-service";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    email?: string;
    password?: string;
  };

  const result = await handleSignInRequest(body, signInWithEmail);

  return NextResponse.json(result.body, { status: result.status });
}
