"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleSignOut() {
    setPending(true);

    try {
      await fetch("/api/auth/signout", {
        method: "POST",
      });
      router.refresh();
      router.push("/");
    } finally {
      setPending(false);
    }
  }

  return (
    <button type="button" className="button button--secondary" onClick={handleSignOut} disabled={pending}>
      {pending ? "Signing out..." : "Sign out"}
    </button>
  );
}
