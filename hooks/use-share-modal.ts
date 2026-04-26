"use client";

import { useRef, useState } from "react";

import type { ShareData } from "@/lib/share-presets";

export function useShareModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [shareData, setShareData] = useState<ShareData | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  const openShareModal = (data: ShareData) => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setShareData(data);
    setIsOpen(true);
  };

  const closeShareModal = () => {
    setIsOpen(false);
    closeTimerRef.current = window.setTimeout(() => {
      setShareData(null);
      closeTimerRef.current = null;
    }, 150);
  };

  return { isOpen, shareData, openShareModal, closeShareModal };
}
