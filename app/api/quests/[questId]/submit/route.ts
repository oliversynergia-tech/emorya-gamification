import { NextResponse } from "next/server";

import { submitQuest } from "@/server/services/quest-service";

type RouteContext = {
  params: Promise<{
    questId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { questId } = await context.params;
    const payload = (await request.json()) as Record<string, unknown>;
    const result = await submitQuest({ questId, payload });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to submit quest.";
    const status = message.includes("signed in") ? 401 : message.includes("not unlocked") ? 403 : 400;

    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
