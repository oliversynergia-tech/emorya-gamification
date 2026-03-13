import type { WalletQuestResult } from "@/lib/types";

export function resolveWalletQuestVerification({
  linkedWallets,
  selectedWalletAddress,
  metadata,
}: {
  linkedWallets: Array<{
    walletAddress: string;
    linkedAt: string;
  }>;
  selectedWalletAddress?: unknown;
  metadata: Record<string, string | number | boolean | null>;
}): WalletQuestResult {
  if (linkedWallets.length === 0) {
    throw new Error("Link a MultiversX wallet before submitting this quest.");
  }

  const normalizedSelectedAddress =
    typeof selectedWalletAddress === "string" && selectedWalletAddress.trim()
      ? selectedWalletAddress.trim()
      : linkedWallets.length === 1
        ? linkedWallets[0].walletAddress
        : "";

  if (!normalizedSelectedAddress) {
    throw new Error("Select one of your linked wallets before submitting this quest.");
  }

  const selectedWallet = linkedWallets.find((wallet) => wallet.walletAddress === normalizedSelectedAddress);

  if (!selectedWallet) {
    throw new Error("Selected wallet is not linked to this account.");
  }

  const requiredPrefix =
    typeof metadata.requiredWalletPrefix === "string" ? metadata.requiredWalletPrefix.trim().toLowerCase() : "erd";

  if (!selectedWallet.walletAddress.toLowerCase().startsWith(requiredPrefix)) {
    throw new Error(`Linked wallet must start with ${requiredPrefix}.`);
  }

  const minLinkedWalletAgeDays = Number(metadata.minLinkedWalletAgeDays ?? 0);
  const walletAgeDays = Math.max(
    Math.floor((Date.now() - new Date(selectedWallet.linkedAt).getTime()) / (1000 * 60 * 60 * 24)),
    0,
  );

  if (minLinkedWalletAgeDays > 0 && walletAgeDays < minLinkedWalletAgeDays) {
    throw new Error(`Linked wallet must be connected for at least ${minLinkedWalletAgeDays} days.`);
  }

  return {
    walletAddress: selectedWallet.walletAddress,
    linkedAt: selectedWallet.linkedAt,
    walletAgeDays,
  };
}
