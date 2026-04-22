"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { AdminOverviewData } from "@/lib/types";

type RoleDirectoryItem = AdminOverviewData["roleDirectory"][number];

export function RoleManagementPanel({
  initialUsers,
  initialAdmins,
  canManageAdmins,
}: {
  initialUsers: RoleDirectoryItem[];
  initialAdmins: AdminOverviewData["adminDirectory"];
  canManageAdmins: boolean;
}) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [admins, setAdmins] = useState(initialAdmins);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [pendingAdminAction, setPendingAdminAction] = useState<string | null>(null);
  const [adminEmail, setAdminEmail] = useState("");
  const [grantConfirmation, setGrantConfirmation] = useState("");
  const [revokeConfirmation, setRevokeConfirmation] = useState<Record<string, string>>({});
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

  async function submitAdminGrant() {
    setPendingAdminAction("grant");
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/admin/admin-roles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: adminEmail,
          confirmation: grantConfirmation,
        }),
      });

      const result = (await response.json()) as {
        ok: boolean;
        error?: string;
        roleDirectory?: RoleDirectoryItem[];
        adminDirectory?: AdminOverviewData["adminDirectory"];
      };

      if (!response.ok || !result.ok || !result.roleDirectory || !result.adminDirectory) {
        setError(result.error ?? "Unable to grant admin access.");
        return;
      }

      setUsers(result.roleDirectory);
      setAdmins(result.adminDirectory);
      setAdminEmail("");
      setGrantConfirmation("");
      setMessage("Admin role granted.");
      router.refresh();
    } catch {
      setError("Unable to reach the admin role service.");
    } finally {
      setPendingAdminAction(null);
    }
  }

  async function revokeAdmin(userId: string) {
    setPendingAdminAction(userId);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/admin/admin-roles", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          confirmation: revokeConfirmation[userId] ?? "",
        }),
      });

      const result = (await response.json()) as {
        ok: boolean;
        error?: string;
        roleDirectory?: RoleDirectoryItem[];
        adminDirectory?: AdminOverviewData["adminDirectory"];
      };

      if (!response.ok || !result.ok || !result.roleDirectory || !result.adminDirectory) {
        setError(result.error ?? "Unable to revoke admin access.");
        return;
      }

      setUsers(result.roleDirectory);
      setAdmins(result.adminDirectory);
      setRevokeConfirmation((current) => ({ ...current, [userId]: "" }));
      setMessage("Admin role revoked.");
      router.refresh();
    } catch {
      setError("Unable to reach the admin role service.");
    } finally {
      setPendingAdminAction(null);
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
      <div className="panel panel--glass">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Protected admin grants</p>
            <h3>Separate elevated-access workflow</h3>
          </div>
        </div>
        <div className="profile-grid">
          <label className="field">
            <span>User email</span>
            <input
              type="email"
              value={adminEmail}
              placeholder="user@example.com"
              onChange={(event) => setAdminEmail(event.target.value)}
            />
          </label>
          <label className="field">
            <span>Type GRANT ADMIN</span>
            <input
              value={grantConfirmation}
              placeholder="GRANT ADMIN"
              onChange={(event) => setGrantConfirmation(event.target.value)}
            />
          </label>
        </div>
        <div className="review-bulk-actions">
          <button
            className="button button--primary button--small"
            type="button"
            disabled={pendingAdminAction === "grant" || !canManageAdmins}
            onClick={submitAdminGrant}
          >
            {pendingAdminAction === "grant" ? "Granting..." : "Grant admin"}
          </button>
          <p className="form-note">
            {canManageAdmins
              ? "Admin access requires an explicit confirmation phrase and uses a separate API path."
              : "Only super admins can grant or revoke admin access. Standard admins can still moderate and manage reviewer roles."}
          </p>
        </div>
        <div className="review-history__list">
          {admins.map((admin) => (
            <article key={admin.userId} className="review-history__item">
              <div className="quest-card__meta">
                <span>{admin.email ?? "No email"}</span>
                <span>{admin.grantedAt ? new Date(admin.grantedAt).toLocaleDateString() : "Legacy grant"}</span>
              </div>
              <h4>{admin.displayName}</h4>
              <div className="review-history__meta">
                <span>Role: {admin.role === "super_admin" ? "Super admin" : "Admin"}</span>
                <span>Granted by: {admin.grantedByDisplayName ?? "System seed"}</span>
              </div>
              <label className="field">
                <span>Type REVOKE ADMIN</span>
                <input
                  value={revokeConfirmation[admin.userId] ?? ""}
                  placeholder="REVOKE ADMIN"
                  onChange={(event) =>
                    setRevokeConfirmation((current) => ({
                      ...current,
                      [admin.userId]: event.target.value,
                    }))
                  }
                />
              </label>
              <button
                className="button button--secondary button--small"
                type="button"
                disabled={pendingAdminAction === admin.userId || !canManageAdmins || admin.role === "super_admin"}
                onClick={() => revokeAdmin(admin.userId)}
              >
                {admin.role === "super_admin"
                  ? "Super admin locked"
                  : pendingAdminAction === admin.userId
                    ? "Updating..."
                    : "Revoke admin"}
              </button>
            </article>
          ))}
        </div>
      </div>
      <div className="review-history__list">
        {users.map((user) => {
          const isSuperAdmin = user.roles.includes("super_admin");
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
                <span className={`badge ${isSuperAdmin ? "badge--pink" : ""}`}>Super admin {isSuperAdmin ? "on" : "off"}</span>
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
      {message ? <p className="status status--success" role="status" aria-live="polite">{message}</p> : null}
      {error ? <p className="status status--error" role="alert">{error}</p> : null}
    </section>
  );
}
