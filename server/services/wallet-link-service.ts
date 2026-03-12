import {
  buildWalletChallengeMessage,
  generateWalletChallengeNonce,
  getWalletChallengeExpiryDate,
  isValidMultiversxAddress,
  normalizeMultiversxAddress,
  verifyMultiversxMessageSignature,
} from "@/server/auth/multiversx";
import {
  attachWalletIdentity,
  consumeWalletChallenge,
  createWalletLinkChallenge,
  findActiveWalletChallenge,
  findWalletIdentityOwner,
} from "@/server/repositories/auth-repository";
import { getAuthenticatedUser } from "@/server/services/auth-service";

export async function createWalletLinkChallengeForCurrentUser(walletAddressInput: string) {
  const currentUser = await getAuthenticatedUser();

  if (!currentUser) {
    throw new Error("You must be signed in to link a wallet.");
  }

  const walletAddress = normalizeMultiversxAddress(walletAddressInput);

  if (!isValidMultiversxAddress(walletAddress)) {
    throw new Error("Invalid MultiversX wallet address.");
  }

  const existingOwnerId = await findWalletIdentityOwner(walletAddress);

  if (existingOwnerId && existingOwnerId !== currentUser.id) {
    throw new Error("That wallet is already linked to another account.");
  }

  const nonce = generateWalletChallengeNonce();
  const expiresAt = getWalletChallengeExpiryDate();
  const challengeMessage = buildWalletChallengeMessage({
    displayName: currentUser.displayName,
    walletAddress,
    nonce,
  });

  const challenge = await createWalletLinkChallenge({
    userId: currentUser.id,
    walletAddress,
    nonce,
    challengeMessage,
    expiresAt,
  });

  return {
    challengeId: challenge.id,
    walletAddress: challenge.wallet_address,
    nonce: challenge.nonce,
    challengeMessage: challenge.challenge_message,
    expiresAt: challenge.expires_at,
    verificationMode: "multiversx-sdk-core",
  };
}

export async function completeWalletLinkForCurrentUser({
  challengeId,
  walletAddress: walletAddressInput,
  signature,
  signedMessage,
}: {
  challengeId: string;
  walletAddress: string;
  signature: string;
  signedMessage: string;
}) {
  const currentUser = await getAuthenticatedUser();

  if (!currentUser) {
    throw new Error("You must be signed in to link a wallet.");
  }

  const walletAddress = normalizeMultiversxAddress(walletAddressInput);

  if (!isValidMultiversxAddress(walletAddress)) {
    throw new Error("Invalid MultiversX wallet address.");
  }

  if (!signature.trim()) {
    throw new Error("A wallet signature is required.");
  }

  const challenge = await findActiveWalletChallenge({
    challengeId,
    userId: currentUser.id,
    walletAddress,
  });

  if (!challenge) {
    throw new Error("Wallet link challenge is missing, expired, or already used.");
  }

  if (signedMessage.trim() !== challenge.challenge_message) {
    throw new Error("Signed message does not match the issued challenge.");
  }

  const signatureIsValid = await verifyMultiversxMessageSignature({
    walletAddress,
    signedMessage,
    signatureHex: signature,
  });

  if (!signatureIsValid) {
    throw new Error("MultiversX signature verification failed.");
  }

  const existingOwnerId = await findWalletIdentityOwner(walletAddress);

  if (existingOwnerId && existingOwnerId !== currentUser.id) {
    throw new Error("That wallet is already linked to another account.");
  }

  await attachWalletIdentity({
    userId: currentUser.id,
    walletAddress,
  });

  await consumeWalletChallenge(challenge.id);

  return {
    linked: true,
    walletAddress,
    verificationMode: "multiversx-sdk-core",
    verificationNote: "Wallet signature verified and linked successfully.",
  };
}
