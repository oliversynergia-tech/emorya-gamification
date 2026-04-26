import { NextResponse } from "next/server";

import { submitQuestBySlug } from "@/server/services/quest-service";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      questSlug?: unknown;
      submissionData?: unknown;
    };

    const questSlug = typeof body.questSlug === "string" ? body.questSlug.trim() : "";
    const submissionData =
      body.submissionData && typeof body.submissionData === "object" && !Array.isArray(body.submissionData)
        ? (body.submissionData as Record<string, unknown>)
        : {};

    if (!questSlug) {
      return NextResponse.json({ ok: false, error: "questSlug is required." }, { status: 400 });
    }

    const result = await submitQuestBySlug({
      questSlug,
      payload: submissionData,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to submit quest.";

    return NextResponse.json(
      { ok: false, error: message },
      { status: message.includes("signed in") ? 401 : message.includes("not unlocked") ? 403 : 400 },
    );
  }
}
