"use client";

import { ReactNode, useEffect, useId, useRef, useState } from "react";

export function Tooltip({ text, children }: { text: string; children?: ReactNode }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<"above" | "below">("above");
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const timeoutRef = useRef<number | null>(null);

  function clearOpenDelay() {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }

  function scheduleOpen() {
    clearOpenDelay();
    timeoutRef.current = window.setTimeout(() => {
      setOpen(true);
    }, 150);
  }

  function closeTooltip() {
    clearOpenDelay();
    setOpen(false);
  }

  function toggleTooltip() {
    clearOpenDelay();
    setOpen((current) => !current);
  }

  useEffect(() => () => clearOpenDelay(), []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const trigger = triggerRef.current;
    const tooltip = tooltipRef.current;

    if (trigger && tooltip) {
      const triggerRect = trigger.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      setPlacement(triggerRect.top < tooltipRect.height + 24 ? "below" : "above");
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node | null;

      if (!target) {
        return;
      }

      if (triggerRef.current?.contains(target) || tooltipRef.current?.contains(target)) {
        return;
      }

      closeTooltip();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeTooltip();
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <span className="tooltip-wrap">
      <button
        ref={triggerRef}
        type="button"
        className={`tooltip-trigger${children ? " tooltip-trigger--content" : ""}`}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onMouseEnter={scheduleOpen}
        onMouseLeave={closeTooltip}
        onFocus={scheduleOpen}
        onBlur={closeTooltip}
        onClick={toggleTooltip}
      >
        {children ? children : <span className="tooltip-trigger__icon" aria-hidden="true">ⓘ</span>}
        {!children ? <span className="sr-only">More info</span> : null}
      </button>
      {open ? (
        <div
          id={id}
          ref={tooltipRef}
          role="tooltip"
          className={`tooltip-bubble tooltip-bubble--${placement}`}
        >
          <span className="tooltip-bubble__arrow" aria-hidden="true" />
          {text}
        </div>
      ) : null}
    </span>
  );
}
