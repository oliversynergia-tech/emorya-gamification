"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";

import type { ShareData } from "@/lib/share-presets";

export interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareData: ShareData;
  onShare?: (platform: string) => void;
}

type SharePlatformButton = {
  key: "x" | "telegram" | "whatsapp";
  label: string;
  href: string;
  icon: ReactNode;
};

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M17.53 3H20.9l-7.36 8.41L22 21h-6.64l-5.2-6.8L4.2 21H.82l7.87-8.99L0 3h6.8l4.7 6.2L17.53 3Z"
        fill="currentColor"
      />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M21.94 4.66 18.8 19.47c-.24 1.05-.86 1.31-1.74.82l-4.82-3.56-2.32 2.23c-.26.26-.47.47-.97.47l.35-4.97 9.04-8.17c.39-.35-.08-.55-.61-.2L6.56 13.2 1.8 11.71c-1.03-.32-1.05-1.03.22-1.52L20.6 3.02c.86-.32 1.61.2 1.34 1.64Z"
        fill="currentColor"
      />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M20.52 3.48A11.86 11.86 0 0 0 12.08 0C5.55 0 .24 5.31.24 11.84c0 2.09.55 4.14 1.59 5.95L0 24l6.4-1.67a11.82 11.82 0 0 0 5.68 1.45h.01c6.53 0 11.84-5.31 11.84-11.84 0-3.17-1.24-6.15-3.41-8.46Zm-8.44 18.3h-.01a9.96 9.96 0 0 1-5.08-1.39l-.36-.21-3.8 1 1.01-3.7-.23-.38a9.93 9.93 0 0 1-1.52-5.26c0-5.48 4.46-9.94 9.95-9.94 2.65 0 5.14 1.03 7.01 2.91a9.84 9.84 0 0 1 2.92 7.03c0 5.49-4.46 9.95-9.89 9.95Zm5.45-7.44c-.3-.15-1.77-.87-2.05-.96-.27-.1-.47-.15-.67.15s-.77.96-.95 1.16c-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.39-1.47a8.88 8.88 0 0 1-1.66-2.06c-.17-.3-.02-.46.13-.61.13-.13.3-.35.44-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.48-.5-.67-.5l-.57-.01c-.2 0-.52.07-.79.37s-1.03 1.01-1.03 2.47 1.05 2.87 1.2 3.07c.15.2 2.06 3.15 5 4.41.7.3 1.25.47 1.68.6.71.23 1.36.2 1.87.12.57-.09 1.77-.72 2.02-1.41.25-.69.25-1.28.17-1.4-.07-.11-.27-.19-.57-.34Z"
        fill="currentColor"
      />
    </svg>
  );
}

function getFocusableElements(container: HTMLElement | null) {
  if (!container) {
    return [];
  }

  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  );
}

export function ShareModal({ isOpen, onClose, shareData, onShare }: ShareModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<number | null>(null);
  const previewText = useMemo(() => `${shareData.message}\n\n${shareData.profileUrl}`, [shareData.message, shareData.profileUrl]);
  const shareButtons = useMemo<SharePlatformButton[]>(
    () => [
      {
        key: "x",
        label: "Share on X",
        href: `https://x.com/intent/tweet?text=${encodeURIComponent(`${shareData.message}\n\n${shareData.profileUrl}`)}&hashtags=${shareData.hashtags.map((tag) => tag.replace(/^#/, "")).join(",")}`,
        icon: <XIcon />,
      },
      {
        key: "telegram",
        label: "Share on Telegram",
        href: `https://t.me/share/url?url=${encodeURIComponent(shareData.profileUrl)}&text=${encodeURIComponent(shareData.message)}`,
        icon: <TelegramIcon />,
      },
      {
        key: "whatsapp",
        label: "Share on WhatsApp",
        href: `https://wa.me/?text=${encodeURIComponent(`${shareData.message}\n\n${shareData.profileUrl}`)}`,
        icon: <WhatsAppIcon />,
      },
    ],
    [shareData.hashtags, shareData.message, shareData.profileUrl],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusable = getFocusableElements(dialogRef.current);

      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement as HTMLElement | null;

      if (event.shiftKey && activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        window.clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(shareData.profileUrl);
      setCopied(true);

      if (copyTimeoutRef.current) {
        window.clearTimeout(copyTimeoutRef.current);
      }

      copyTimeoutRef.current = window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      setCopied(false);
    }
  }

  function handleOverlayClick(event: React.MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  function handleShareIntent(platform: SharePlatformButton["key"], href: string) {
    window.open(href, "_blank", "noopener,noreferrer");
    onShare?.(platform);
  }

  return (
    <div
      className={`share-modal-overlay${isOpen ? " share-modal-overlay--open" : " share-modal-overlay--closing"}`}
      onClick={handleOverlayClick}
    >
      <div
        ref={dialogRef}
        className={`share-modal${isOpen ? " share-modal--open" : " share-modal--closing"}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="share-modal__header">
          <div>
            <p className="eyebrow">Share</p>
            <h2 id={titleId}>{shareData.title}</h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="share-modal__close"
            onClick={onClose}
            aria-label="Close share dialog"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div className="share-modal__preview" aria-label="Share preview">
          <p>{previewText}</p>
        </div>

        <div className="share-modal__actions" aria-label="Share destinations">
          {shareButtons.map((button) => (
            <button
              key={button.key}
              type="button"
              className="button button--secondary share-modal__platform"
              onClick={() => handleShareIntent(button.key, button.href)}
            >
              <span className="share-modal__platform-icon">{button.icon}</span>
              <span>{button.label}</span>
            </button>
          ))}
        </div>

        <button type="button" className="button button--primary share-modal__copy" onClick={handleCopyLink}>
          {copied ? "Copied!" : "Copy Link"}
        </button>

        <p className="form-note">Your referral link is included automatically.</p>
      </div>
    </div>
  );
}
