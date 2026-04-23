import { createHash, randomBytes } from "crypto";

import { cookies } from "next/headers";

import { getConfig } from "@/lib/config";
import { SESSION_COOKIE_NAME } from "@/lib/session-cookie";

const SESSION_LIFETIME_MS = 1000 * 60 * 60 * 24 * 30;

export function generateSessionToken() {
  return randomBytes(32).toString("hex");
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function getSessionExpiryDate() {
  return new Date(Date.now() + SESSION_LIFETIME_MS);
}

export async function setSessionCookie(token: string, expiresAt: Date) {
  const cookieStore = await cookies();
  const { appUrl } = getConfig();
  const isSecure = appUrl.startsWith("https://");

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecure,
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    expires: new Date(0),
  });
}

export async function readSessionCookie() {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}
