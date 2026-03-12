import { NextResponse } from "next/server";

import { completeWalletLinkForCurrentUser } from "@/server/services/wallet-link-service";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      challengeId?: string;
      walletAddress?: string;
      signature?: string;
      signedMessage?: string;
    };

    const challengeId = body.challengeId?.trim();
    const walletAddress = body.walletAddress?.trim();
    const signature = body.signature?.trim();
    const signedMessage = body.signedMessage?.trim();

    if (!challengeId || !walletAddress || !signature || !signedMessage) {
      return NextResponse.json(
        {
          ok: false,
          error: "challengeId, walletAddress, signature, and signedMessage are required.",
        },
        { status: 400 },
      );
    }

    const result = await completeWalletLinkForCurrentUser({
      challengeId,
      walletAddress,
      signature,
      signedMessage,
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to complete wallet link.";
    const status = message.includes("signed in") ? 401 : 400;

    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
