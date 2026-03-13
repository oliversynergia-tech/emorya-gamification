import { NextResponse } from "next/server";

import { listPendingQuestReviews } from "@/server/services/quest-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const queue = await listPendingQuestReviews();

    return NextResponse.json({ ok: true, queue });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load the review queue.";
    const status = message.includes("signed in")
      ? 401
      : message.includes("Admin access")
        ? 403
        : 400;

    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
