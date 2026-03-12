import { NextResponse } from "next/server";

import { createWalletLinkChallengeForCurrentUser } from "@/server/services/wallet-link-service";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { walletAddress?: string };
    const walletAddress = body.walletAddress?.trim();

    if (!walletAddress) {
      return NextResponse.json(
        { ok: false, error: "Wallet address is required." },
        { status: 400 },
      );
    }

    const challenge = await createWalletLinkChallengeForCurrentUser(walletAddress);

    return NextResponse.json({ ok: true, challenge });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create wallet challenge.";
    const status = message.includes("signed in") ? 401 : 400;

    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
