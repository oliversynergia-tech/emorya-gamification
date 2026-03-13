import type { AuthUser } from "@/lib/types";

export async function handleSignUpRequest(
  body: {
    email?: string;
    password?: string;
    displayName?: string;
    referralCode?: string;
  },
  signUpWithEmail: (input: {
    email: string;
    password: string;
    displayName: string;
    referralCode?: string;
  }) => Promise<AuthUser>,
) {
  const email = body.email?.trim().toLowerCase();
  const password = body.password?.trim();
  const displayName = body.displayName?.trim();

  if (!email || !password || !displayName) {
    return {
      status: 400,
      body: { ok: false, error: "Email, password, and display name are required." },
    };
  }

  if (password.length < 10) {
    return {
      status: 400,
      body: { ok: false, error: "Password must be at least 10 characters." },
    };
  }

  try {
    const referralCode = body.referralCode?.trim().toUpperCase() || undefined;
    const user = await signUpWithEmail({ email, password, displayName, referralCode });

    return {
      status: 201,
      body: { ok: true, user },
    };
  } catch (error) {
    return {
      status: 400,
      body: { ok: false, error: error instanceof Error ? error.message : "Unable to sign up." },
    };
  }
}

export async function handleSignInRequest(
  body: {
    email?: string;
    password?: string;
  },
  signInWithEmail: (input: { email: string; password: string }) => Promise<AuthUser>,
) {
  const email = body.email?.trim().toLowerCase();
  const password = body.password?.trim();

  if (!email || !password) {
    return {
      status: 400,
      body: { ok: false, error: "Email and password are required." },
    };
  }

  try {
    const user = await signInWithEmail({ email, password });

    return {
      status: 200,
      body: { ok: true, user },
    };
  } catch (error) {
    return {
      status: 401,
      body: { ok: false, error: error instanceof Error ? error.message : "Unable to sign in." },
    };
  }
}
