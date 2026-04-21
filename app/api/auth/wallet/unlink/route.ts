import { NextResponse } from "next/server";

import { unlinkWalletForCurrentUser } from "@/server/services/wallet-link-service";

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

    const result = await unlinkWalletForCurrentUser(walletAddress);

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to disconnect wallet.";
    const status = message.includes("signed in") ? 401 : message.includes("not linked") ? 404 : 400;

    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
