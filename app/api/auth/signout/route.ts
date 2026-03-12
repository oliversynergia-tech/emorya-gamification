import { NextResponse } from "next/server";

import { signOutCurrentSession } from "@/server/services/auth-service";

export async function POST() {
  await signOutCurrentSession();

  return NextResponse.json({ ok: true });
}
