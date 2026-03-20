"use client";

import { MouseEvent } from "react";
import { useRouter } from "next/navigation";

async function trackMissionEvent(payload: {
  packId: string;
  eventType: string;
  ctaLabel: string;
  href: string;
}) {
  try {
    await fetch("/api/campaign-events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // Ignore tracking failures; navigation should still work.
  }
}

export function MissionLink({
  href,
  className,
  children,
  packId,
  eventType,
  ctaLabel,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
  packId: string;
  eventType: string;
  ctaLabel: string;
}) {
  const router = useRouter();

  async function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    event.preventDefault();
    await trackMissionEvent({
      packId,
      eventType,
      ctaLabel,
      href,
    });

    if (href.startsWith("/")) {
      router.push(href);
      return;
    }

    window.location.assign(href);
  }

  return (
    <a href={href} className={className} onClick={handleClick}>
      {children}
    </a>
  );
}
