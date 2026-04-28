"use client";

import Link from "next/link";
import {
  Component,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";

const dismissedHintsStoragePrefix = "emorya_dismissed_hints";

export interface OnboardingHintProps {
  hintKey: string;
  title: string;
  body: string;
  isNewUser: boolean;
  userId?: string;
  secondaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

type OnboardingHintInnerProps = OnboardingHintProps;

type OnboardingHintErrorBoundaryState = {
  hasError: boolean;
};

class OnboardingHintErrorBoundary extends Component<
  { children: ReactNode },
  OnboardingHintErrorBoundaryState
> {
  state: OnboardingHintErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  override componentDidCatch() {
    // Swallow hint-only failures so the page continues to render normally.
  }

  override render() {
    if (this.state.hasError) {
      return null;
    }

    return this.props.children;
  }
}

function readDismissedHints(storageKey: string) {
  try {
    const raw = window.localStorage.getItem(storageKey);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

function writeDismissedHints(storageKey: string, dismissedHints: string[]) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(dismissedHints));
  } catch {
    // Ignore storage failures so the hint itself never blocks the page.
  }
}

function OnboardingHintInner({
  hintKey,
  title,
  body,
  isNewUser,
  userId,
  secondaryAction,
}: OnboardingHintInnerProps) {
  const storageKey = useMemo(
    () => `${dismissedHintsStoragePrefix}:${userId ?? "anonymous"}`,
    [userId],
  );
  const [shouldRender, setShouldRender] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isNewUser) {
      setShouldRender(false);
      setIsVisible(false);
      return;
    }

    const dismissedHints = readDismissedHints(storageKey);

    if (dismissedHints.includes(hintKey)) {
      setShouldRender(false);
      setIsVisible(false);
      return;
    }

    setShouldRender(true);
    const timer = window.setTimeout(() => setIsVisible(true), 0);
    return () => window.clearTimeout(timer);
  }, [hintKey, isNewUser, storageKey]);

  if (!isNewUser || !shouldRender) {
    return null;
  }

  const handleDismiss = () => {
    const dismissedHints = readDismissedHints(storageKey);

    if (!dismissedHints.includes(hintKey)) {
      writeDismissedHints(storageKey, [...dismissedHints, hintKey]);
    }

    setIsVisible(false);
    window.setTimeout(() => setShouldRender(false), 150);
  };

  return (
    <aside
      className={`onboarding-hint${isVisible ? " onboarding-hint--visible" : ""}`}
      aria-label={title}
    >
      <div className="onboarding-hint__content">
        <div className="onboarding-hint__copy">
          <strong>{title}</strong>
          <p>{body}</p>
        </div>
        <div className="onboarding-hint__actions">
          {secondaryAction?.onClick ? (
            <button
              type="button"
              className="button button--secondary onboarding-hint__secondary"
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </button>
          ) : secondaryAction?.href ? (
            <Link
              href={secondaryAction.href}
              className="button button--secondary onboarding-hint__secondary"
            >
              {secondaryAction.label}
            </Link>
          ) : null}
          <button
            type="button"
            className="button onboarding-hint__primary"
            onClick={handleDismiss}
          >
            Got it
          </button>
        </div>
      </div>
    </aside>
  );
}

export function OnboardingHint(props: OnboardingHintProps) {
  return (
    <OnboardingHintErrorBoundary>
      <OnboardingHintInner {...props} />
    </OnboardingHintErrorBoundary>
  );
}
