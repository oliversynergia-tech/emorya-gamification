import { randomBytes } from "crypto";

import { Address } from "@multiversx/sdk-core/out/core/address";
import { Message, MessageComputer } from "@multiversx/sdk-core/out/core/message";
import { UserVerifier } from "@multiversx/sdk-core/out/wallet/userVerifier";

import type { AuthUser } from "@/lib/types";

const MULTIVERSX_ADDRESS_REGEX = /^erd1[0-9a-z]{58}$/;
const CHALLENGE_LIFETIME_MS = 1000 * 60 * 10;
const messageComputer = new MessageComputer();

export function normalizeMultiversxAddress(address: string) {
  return address.trim().toLowerCase();
}

export function isValidMultiversxAddress(address: string) {
  return MULTIVERSX_ADDRESS_REGEX.test(normalizeMultiversxAddress(address));
}

export function generateWalletChallengeNonce() {
  return randomBytes(16).toString("hex");
}

export function getWalletChallengeExpiryDate() {
  return new Date(Date.now() + CHALLENGE_LIFETIME_MS);
}

export function buildWalletChallengeMessage({
  displayName,
  walletAddress,
  nonce,
}: {
  displayName: AuthUser["displayName"];
  walletAddress: string;
  nonce: string;
}) {
  return [
    "Emorya wallet linking request",
    `User: ${displayName}`,
    `Wallet: ${walletAddress}`,
    `Nonce: ${nonce}`,
    "Purpose: link this MultiversX wallet to your Emorya account.",
    "If you did not request this, do not sign.",
  ].join("\n");
}

export async function verifyMultiversxMessageSignature({
  walletAddress,
  signedMessage,
  signatureHex,
}: {
  walletAddress: string;
  signedMessage: string;
  signatureHex: string;
}) {
  const normalizedAddress = normalizeMultiversxAddress(walletAddress);
  const trimmedSignatureHex = signatureHex.replace(/^0x/, "").trim();
  const signature = Buffer.from(trimmedSignatureHex, "hex");
  const address = Address.newFromBech32(normalizedAddress);
  const verifier = UserVerifier.fromAddress(address);
  const message = new Message({
    address,
    data: Buffer.from(signedMessage),
    signature,
  });

  return verifier.verify(messageComputer.computeBytesForVerifying(message), signature);
}
