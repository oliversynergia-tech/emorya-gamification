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
          url: typeof window !== "undefined" ? window.location.origin : "http://localhost:3000",
          icons: [],
        },
      },
    );

    providerPromise = provider.init().then(() => provider);
  }

  return providerPromise;
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
      const provider = await getWalletProvider();
      const { uri, approval } = await provider.connect();

      if (uri) {
        setQrCodeDataUrl(await QRCode.toDataURL(uri, { margin: 1, width: 240 }));
        setWalletStatus(`Scan the QR code with ${walletLabel}, then approve the connection.`);
      }

      const account = await provider.login({ approval });

      if (!account?.address) {
        throw new Error(`${walletLabel} did not return a wallet address.`);
      }

      setWalletAddress(account.address);
      setWalletStatus(`Connected ${walletLabel} wallet ${account.address}`);

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

      const signedMessage = await provider.signMessage(
        new Message({
          address: Address.newFromBech32(account.address),
          data: new TextEncoder().encode(issuedChallenge.challengeMessage),
        }),
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
      setError(caughtError instanceof Error ? caughtError.message : `${walletLabel} linking failed.`);
    } finally {
      setPending(false);
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
              {address}
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
        <p className="status status--error">
          Add `NEXT_PUBLIC_MULTIVERSX_WALLETCONNECT_PROJECT_ID` to `.env.local` to enable xPortal.
        </p>
      ) : null}
      {walletStatus ? <p className="status status--success">{walletStatus}</p> : null}
      {qrCodeDataUrl ? (
        <div className="qr-card">
          <strong>{walletLabel} QR</strong>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrCodeDataUrl} alt="xPortal QR code" className="qr-card__image" />
          <small>Open {walletLabel}, scan the QR code, then approve connect and sign requests.</small>
          <p className="mission-cue mission-cue--planning">
            <strong>Review the route ahead</strong> Reopen the mission path after approval if the wallet gate is still the current blocker.
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
      {message ? <p className="status status--success">{message}</p> : null}
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
      {error ? <p className="status status--error">{error}</p> : null}
      <p className="form-note">
        This now expects a real MultiversX signature for the issued challenge message.
      </p>
    </section>
  );
}
