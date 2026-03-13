"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { AdminOverviewData } from "@/lib/types";

type RoleDirectoryItem = AdminOverviewData["roleDirectory"][number];

export function RoleManagementPanel({
  initialUsers,
}: {
  initialUsers: RoleDirectoryItem[];
}) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggleReviewer(user: RoleDirectoryItem, nextValue: boolean) {
    setPendingUserId(user.userId);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/admin/roles", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.userId,
          reviewerEnabled: nextValue,
        }),
      });

      const result = (await response.json()) as {
        ok: boolean;
        error?: string;
        users?: RoleDirectoryItem[];
      };

      if (!response.ok || !result.ok || !result.users) {
        setError(result.error ?? "Unable to update reviewer role.");
        return;
      }

      setUsers(result.users);
      setMessage(
        nextValue
          ? `${user.displayName} can now review submissions.`
          : `${user.displayName} no longer has reviewer access.`,
      );
      router.refresh();
    } catch {
      setError("Unable to reach the role management service.");
    } finally {
      setPendingUserId(null);
    }
  }

  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Permissions</p>
          <h3>Reviewer role management</h3>
        </div>
      </div>
      <div className="review-history__list">
        {users.map((user) => {
          const isAdmin = user.roles.includes("admin");
          const isReviewer = user.roles.includes("reviewer");

          return (
            <article key={user.userId} className="review-history__item">
              <div className="quest-card__meta">
                <span>{user.subscriptionTier}</span>
                <span>{user.email ?? "No email"}</span>
              </div>
              <h4>{user.displayName}</h4>
              <div className="review-history__meta">
                <span>Roles: {user.roles.length ? user.roles.join(", ") : "none"}</span>
              </div>
              <div className="role-pill-row">
                <span className={`badge ${isAdmin ? "badge--pink" : ""}`}>Admin {isAdmin ? "on" : "off"}</span>
                <span className="badge">Reviewer {isReviewer ? "on" : "off"}</span>
              </div>
              <button
                className="button button--secondary button--small"
                type="button"
                disabled={pendingUserId === user.userId}
                onClick={() => toggleReviewer(user, !isReviewer)}
              >
                {pendingUserId === user.userId
                  ? "Updating..."
                  : isReviewer
                    ? "Remove reviewer"
                    : "Grant reviewer"}
              </button>
            </article>
          );
        })}
      </div>
      {message ? <p className="status status--success">{message}</p> : null}
      {error ? <p className="status status--error">{error}</p> : null}
    </section>
  );
}
