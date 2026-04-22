"use client";

import { type ReactNode, useRef } from "react";

export function MobileNavMenu({ children }: { children: ReactNode }) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  return (
    <details
      ref={detailsRef}
      className="mobile-nav"
      onKeyDown={(event) => {
        if (event.key === "Escape" && detailsRef.current?.open) {
          detailsRef.current.open = false;
          detailsRef.current.querySelector("summary")?.focus();
        }
      }}
    >
      <summary className="mobile-nav__summary" aria-label="Toggle primary navigation menu">
        <span>Menu</span>
        <span aria-hidden="true">+</span>
      </summary>
      <div className="mobile-nav__panel">{children}</div>
    </details>
  );
}
