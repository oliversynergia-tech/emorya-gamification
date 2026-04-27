"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Address } from "@multiversx/sdk-core/out/core/address";
import { Message } from "@multiversx/sdk-core/out/core/message";
import { WalletConnectV2Provider } from "@multiversx/sdk-wallet-connect-provider";
import QRCode from "qrcode";

import { defaultBrandThemeId, getBrandTheme } from "@/lib/brand-themes";
import { getBrandCopyProfile } from "@/lib/brand-copy";

type WalletLinkPanelProps = {
  walletAddresses: string[];
  activeMissionLabel?: string | null;
  activeMissionView?: "active" | "completed" | "all" | "reward";
  walletProductLabel?: string;
};

type ChallengeResponse = {
  ok: boolean;
  error?: string;
  challenge?: {
    challengeId: string;
    walletAddress: string;
    challengeMessage: string;
    expiresAt: string;
    verificationMode: string;
  };
};

const walletConnectProjectId = process.env.NEXT_PUBLIC_MULTIVERSX_WALLETCONNECT_PROJECT_ID;
const chainId = process.env.NEXT_PUBLIC_MULTIVERSX_CHAIN === "devnet" ? "D" : "1";
let providerPromise: Promise<WalletConnectV2Provider> | null = null;

const walletApprovalTimeoutMs = 120_000;

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function getWalletProvider() {
  if (!walletConnectProjectId) {
    throw new Error("Missing NEXT_PUBLIC_MULTIVERSX_WALLETCONNECT_PROJECT_ID.");
  }

  const activeBrandTheme =
    typeof document !== "undefined"
      ? getBrandTheme(document.body.dataset.brandTheme)
      : getBrandTheme(defaultBrandThemeId);

  if (!providerPromise) {
    const provider = new WalletConnectV2Provider(
      {
        onClientLogin() {},
        onClientLogout() {},
        onClientEvent() {},
      },
      chainId,
      "wss://relay.walletconnect.com",
      walletConnectProjectId,
      {
        metadata: {
          name: activeBrandTheme.brand.platformName,
          description: `${activeBrandTheme.brand.platformName} account wallet linking`,
          url: typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL || "",
          icons: [],
        },
      },
    );

    providerPromise = provider.init().then(() => provider);
  }

  return providerPromise;
}

function truncateWalletAddress(address: string) {
  return address.length > 18 ? `${address.slice(0, 8)}...${address.slice(-6)}` : address;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string) {
  return new Promise<T>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => window.clearTimeout(timeout));
  });
}

function getWalletRecoveryMessage(error: unknown, walletLabel: string) {
  const message = error instanceof Error ? error.message : "";

  if (/reject|declin|cancel/i.test(message)) {
    return `Connection was not approved in ${walletLabel}. Try again when you are ready and approve the request in your wallet.`;
  }

  if (/timed out|timeout|No wallet approval/i.test(message)) {
    return `No wallet approval came through. Open ${walletLabel}, scan the QR again, and approve the request before it expires.`;
  }

  if (/Missing NEXT_PUBLIC_MULTIVERSX_WALLETCONNECT_PROJECT_ID/i.test(message)) {
    return `${walletLabel} connection is not enabled in this environment yet.`;
  }

  return message || `${walletLabel} linking failed.`;
}

export function WalletLinkPanel({
  walletAddresses,
  activeMissionLabel = null,
  activeMissionView = "active",
  walletProductLabel,
}: WalletLinkPanelProps) {
  const router = useRouter();
  const activeThemeId = typeof document !== "undefined" ? document.body.dataset.brandTheme ?? defaultBrandThemeId : defaultBrandThemeId;
  const brandCopy = getBrandCopyProfile(activeThemeId);
  const walletLabel = walletProductLabel ?? brandCopy.walletProduct;
  const [walletAddress, setWalletAddress] = useState("");
  const [challenge, setChallenge] = useState<ChallengeResponse["challenge"] | null>(null);
  const [signature, setSignature] = useState("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [walletStatus, setWalletStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [unlinkingAddress, setUnlinkingAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function requestChallenge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/auth/wallet/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress }),
      });

      const result = (await response.json()) as ChallengeResponse;

      if (!response.ok || !result.ok || !result.challenge) {
        setError(result.error ?? "Unable to issue wallet challenge.");
        return;
      }

      setChallenge(result.challenge);
      setMessage("Challenge issued. Sign the message with your wallet, then paste the signature below.");
    } catch {
      setError("Unable to reach the wallet challenge endpoint.");
    } finally {
      setPending(false);
    }
  }

  async function completeWalletLink() {
    if (!challenge) {
      return;
    }

    setPending(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/auth/wallet/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId: challenge.challengeId,
          walletAddress: challenge.walletAddress,
          signature,
          signedMessage: challenge.challengeMessage,
        }),
      });

      const result = (await response.json()) as {
        ok: boolean;
        error?: string;
        result?: { verificationNote?: string };
      };

      if (!response.ok || !result.ok) {
        setError(result.error ?? "Unable to complete wallet link.");
        return;
      }

      setMessage(result.result?.verificationNote ?? "Wallet linked.");
      setChallenge(null);
      setSignature("");
      setWalletAddress("");
      router.refresh();
    } catch {
      setError("Unable to reach the wallet completion endpoint.");
    } finally {
      setPending(false);
    }
  }

  async function connectAndSignWithXPortal() {
    setPending(true);
    setError(null);
    setMessage(null);

    try {
      if (!walletConnectProjectId) {
        throw new Error("Missing NEXT_PUBLIC_MULTIVERSX_WALLETCONNECT_PROJECT_ID.");
      }

      const provider = await getWalletProvider();
      const { uri, approval } = await withTimeout(
        provider.connect(),
        20_000,
        "WalletConnect setup timed out.",
      );

      if (uri) {
        setQrCodeDataUrl(await QRCode.toDataURL(uri, { margin: 1, width: 240 }));
        setWalletStatus(`Scan the QR code with ${walletLabel}, then approve the connection.`);
      }

      const account = await withTimeout(
        provider.login({ approval }),
        walletApprovalTimeoutMs,
        "No wallet approval received before the QR expired.",
      );

      if (!account?.address) {
        throw new Error(`${walletLabel} did not return a wallet address.`);
      }

      setWalletAddress(account.address);
      setWalletStatus(`Connected ${walletLabel} wallet ${truncateWalletAddress(account.address)}.`);

      const challengeResponse = await fetch("/api/auth/wallet/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: account.address }),
      });

      const challengeResult = (await challengeResponse.json()) as ChallengeResponse;

      if (!challengeResponse.ok || !challengeResult.ok || !challengeResult.challenge) {
        throw new Error(challengeResult.error ?? "Unable to issue wallet challenge.");
      }

      const issuedChallenge = challengeResult.challenge;
      setChallenge(issuedChallenge);
      setMessage(`Challenge issued. Confirm the signing request in ${walletLabel}.`);

      const signedMessage = await withTimeout(
        provider.signMessage(
          new Message({
            address: Address.newFromBech32(account.address),
            data: new TextEncoder().encode(issuedChallenge.challengeMessage),
          }),
        ),
        walletApprovalTimeoutMs,
        "No wallet signature received before the request expired.",
      );

      if (!signedMessage.signature) {
        throw new Error(`${walletLabel} did not return a message signature.`);
      }

      const generatedSignature = bytesToHex(signedMessage.signature);
      setSignature(generatedSignature);

      const completeResponse = await fetch("/api/auth/wallet/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId: issuedChallenge.challengeId,
          walletAddress: account.address,
          signature: generatedSignature,
          signedMessage: issuedChallenge.challengeMessage,
        }),
      });

      const completeResult = (await completeResponse.json()) as {
        ok: boolean;
        error?: string;
        result?: { verificationNote?: string };
      };

      if (!completeResponse.ok || !completeResult.ok) {
        throw new Error(completeResult.error ?? "Unable to complete wallet link.");
      }

      setMessage(completeResult.result?.verificationNote ?? "Wallet linked.");
      setWalletStatus(`Wallet linked through ${walletLabel}.`);
      setChallenge(null);
      setSignature("");
      setQrCodeDataUrl(null);
      router.refresh();
    } catch (caughtError) {
      setQrCodeDataUrl(null);
      setWalletStatus(null);
      setError(getWalletRecoveryMessage(caughtError, walletLabel));
    } finally {
      setPending(false);
    }
  }

  async function disconnectWallet(address: string) {
    const confirmed = window.confirm("Disconnect this wallet from your Emorya account?");

    if (!confirmed) {
      return;
    }

    setUnlinkingAddress(address);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/auth/wallet/unlink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address }),
      });

      const result = (await response.json()) as {
        ok: boolean;
        error?: string;
        result?: { verificationNote?: string };
      };

      if (!response.ok || !result.ok) {
        setError(result.error ?? "Unable to disconnect wallet.");
        return;
      }

      setMessage(result.result?.verificationNote ?? "Wallet disconnected.");
      router.refresh();
    } catch {
      setError("Unable to reach the wallet disconnect service.");
    } finally {
      setUnlinkingAddress(null);
    }
  }

  return (
    <section className="panel auth-panel" id="wallet-link-panel">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Wallet link</p>
          <h3>MultiversX identity</h3>
        </div>
      </div>
      <div className="wallet-list">
        {walletAddresses.length > 0 ? (
          walletAddresses.map((address) => (
            <div key={address} className="wallet-pill">
              <span title={address}>{truncateWalletAddress(address)}</span>
              <button
                type="button"
                className="text-link"
                disabled={unlinkingAddress === address}
                onClick={() => disconnectWallet(address)}
                aria-label={`Disconnect wallet ${address}`}
              >
                {unlinkingAddress === address ? "Disconnecting..." : "Disconnect"}
              </button>
            </div>
          ))
        ) : (
          <p className="form-note">No wallet linked yet.</p>
        )}
      </div>
      <form className="form-stack" onSubmit={requestChallenge}>
        <label className="field">
          <span>Wallet address</span>
          <input
            value={walletAddress}
            onChange={(event) => setWalletAddress(event.target.value)}
            placeholder="erd1..."
            required
          />
        </label>
        <button type="submit" className="button button--secondary" disabled={pending}>
          {pending ? "Requesting..." : "Request link challenge"}
        </button>
      </form>
      <div className="wallet-actions">
        <button
          type="button"
          className="button button--primary"
          disabled={pending || !walletConnectProjectId}
          onClick={connectAndSignWithXPortal}
        >
          {pending ? "Opening xPortal..." : "Connect with xPortal"}
        </button>
      </div>
      {!walletConnectProjectId ? (
        <p className="status status--error" role="alert">
          {walletLabel} connection is not enabled in this environment yet.
        </p>
      ) : null}
      {walletStatus ? <p className="status status--success" role="status" aria-live="polite">{walletStatus}</p> : null}
      {qrCodeDataUrl ? (
        <div className="qr-card">
          <strong>{walletLabel} QR</strong>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrCodeDataUrl} alt="xPortal QR code" className="qr-card__image" />
          <small>Open {walletLabel}, scan the QR code, then approve connect and sign requests.</small>
          <p className="mission-cue mission-cue--planning">
            <strong>Next step pending</strong> Once approval is complete, return to your mission path to keep moving.
          </p>
        </div>
      ) : null}
      {challenge ? (
        <div className="challenge-card">
          <strong>Issued challenge</strong>
          <pre>{challenge.challengeMessage}</pre>
          <small>Expires at {new Date(challenge.expiresAt).toLocaleString()}</small>
          <label className="field">
            <span>Paste wallet signature (hex)</span>
            <textarea
              value={signature}
              onChange={(event) => setSignature(event.target.value)}
              placeholder={`Paste the signature generated by ${walletLabel}`}
              required
            />
          </label>
          <button
            type="button"
            className="button button--primary"
            disabled={pending || !signature.trim()}
            onClick={completeWalletLink}
          >
            {pending ? "Verifying..." : "Verify and link wallet"}
          </button>
        </div>
      ) : null}
      {message ? <p className="status status--success" role="status" aria-live="polite">{message}</p> : null}
      {message && activeMissionLabel ? (
        <div className="achievement-card achievement-card--progress">
          <div>
            <strong>{activeMissionLabel} has moved past the wallet gate</strong>
            <p>Your active mission should now refresh with the next progression step instead of the wallet-link prompt.</p>
            <p className="mission-cue mission-cue--ready">
              <strong>Next quest ready</strong> Your mission path should now reopen at the next actionable step.
            </p>
          </div>
          <div className="achievement-card__side">
            <a
              className="text-link"
              href="/dashboard#campaign-mission"
              onClick={() => {
                window.localStorage.setItem("emorya-dashboard-mission-view", activeMissionView);
              }}
            >
              Return to active mission
            </a>
            <a
              className="text-link"
              href="/profile#mission-recap"
              onClick={() => {
                window.localStorage.setItem("emorya-profile-mission-view", activeMissionView === "all" ? "active" : activeMissionView);
              }}
            >
              Review mission recap
            </a>
          </div>
        </div>
      ) : null}
      {error ? <p className="status status--error" role="alert">{error}</p> : null}
      <p className="form-note">
        Wallet linking uses a real MultiversX signature for the issued challenge message. You can disconnect a linked wallet at any time.
      </p>
    </section>
  );
}
