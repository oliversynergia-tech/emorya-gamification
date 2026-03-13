import type { QueryResultRow } from "pg";

import type { AppRole } from "@/lib/types";

import { runQuery } from "@/server/db/client";

type UserRoleRow = QueryResultRow & {
  role: AppRole;
};

type RoleDirectoryRow = QueryResultRow & {
  user_id: string;
  display_name: string;
  email: string | null;
  subscription_tier: "free" | "monthly" | "annual";
  roles: AppRole[] | null;
};

type AdminDirectoryRow = QueryResultRow & {
  user_id: string;
  display_name: string;
  email: string | null;
  role: Extract<AppRole, "super_admin" | "admin">;
  created_at: string | null;
  granted_by_display_name: string | null;
};

export async function getUserRoles(userId: string) {
  const result = await runQuery<UserRoleRow>(
    `SELECT role
     FROM user_roles
     WHERE user_id = $1
     ORDER BY role ASC`,
    [userId],
  );

  return result.rows.map((row) => row.role);
}

export async function userHasRole(userId: string, role: AppRole) {
  const result = await runQuery<{ exists: boolean }>(
    `SELECT EXISTS(
       SELECT 1
       FROM user_roles
       WHERE user_id = $1
         AND role = $2
     ) AS exists`,
    [userId, role],
  );

  return result.rows[0]?.exists ?? false;
}

export async function listUsersWithRoles() {
  const result = await runQuery<RoleDirectoryRow>(
    `SELECT u.id AS user_id,
            u.display_name,
            u.email,
            u.subscription_tier,
            COALESCE(array_agg(ur.role ORDER BY ur.role) FILTER (WHERE ur.role IS NOT NULL), ARRAY[]::app_role[]) AS roles
     FROM users u
     LEFT JOIN user_roles ur ON ur.user_id = u.id
     GROUP BY u.id, u.display_name, u.email, u.subscription_tier, u.created_at
     ORDER BY u.created_at ASC`,
  );

  return result.rows.map((row) => ({
    userId: row.user_id,
    displayName: row.display_name,
    email: row.email,
    subscriptionTier: row.subscription_tier,
    roles: row.roles ?? [],
  }));
}

export async function grantUserRole({
  userId,
  role,
  grantedBy,
}: {
  userId: string;
  role: AppRole;
  grantedBy: string | null;
}) {
  await runQuery(
    `INSERT INTO user_roles (user_id, role, granted_by)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, role) DO NOTHING`,
    [userId, role, grantedBy],
  );
}

export async function revokeUserRole({
  userId,
  role,
}: {
  userId: string;
  role: AppRole;
}) {
  await runQuery(
    `DELETE FROM user_roles
     WHERE user_id = $1
       AND role = $2`,
    [userId, role],
  );
}

export async function listAdminUsers() {
  const result = await runQuery<AdminDirectoryRow>(
    `SELECT u.id AS user_id,
            u.display_name,
            u.email,
            ur.role,
            ur.created_at,
            granted_by.display_name AS granted_by_display_name
     FROM user_roles ur
     INNER JOIN users u ON u.id = ur.user_id
     LEFT JOIN users granted_by ON granted_by.id = ur.granted_by
     WHERE ur.role IN ('super_admin', 'admin')
     ORDER BY CASE ur.role WHEN 'super_admin' THEN 0 ELSE 1 END, ur.created_at ASC, u.display_name ASC`,
  );

  return result.rows.map((row) => ({
    userId: row.user_id,
    displayName: row.display_name,
    email: row.email,
    role: row.role,
    grantedAt: row.created_at,
    grantedByDisplayName: row.granted_by_display_name,
  }));
}

export async function countUsersWithRole(role: AppRole) {
  const result = await runQuery<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM user_roles
     WHERE role = $1`,
    [role],
  );

  return Number(result.rows[0]?.count ?? 0);
}

export async function findUserByEmailForRoleDirectory(email: string) {
  const result = await runQuery<{
    user_id: string;
    display_name: string;
    email: string | null;
  }>(
    `SELECT id AS user_id, display_name, email
     FROM users
     WHERE lower(email) = lower($1)
     LIMIT 1`,
    [email],
  );

  return result.rows[0] ?? null;
}
