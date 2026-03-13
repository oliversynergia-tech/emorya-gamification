import { NextResponse } from "next/server";

import { signUpWithEmail } from "@/server/services/auth-service";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      displayName?: string;
      referralCode?: string;
    };

    const email = body.email?.trim().toLowerCase();
    const password = body.password?.trim();
    const displayName = body.displayName?.trim();

    if (!email || !password || !displayName) {
      return NextResponse.json(
        { ok: false, error: "Email, password, and display name are required." },
        { status: 400 },
      );
    }

    if (password.length < 10) {
      return NextResponse.json(
        { ok: false, error: "Password must be at least 10 characters." },
        { status: 400 },
      );
    }

    const referralCode = body.referralCode?.trim().toUpperCase() || undefined;

    const user = await signUpWithEmail({ email, password, displayName, referralCode });

    return NextResponse.json({ ok: true, user }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unable to sign up." },
      { status: 400 },
    );
  }
}
