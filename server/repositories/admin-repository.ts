import type { QueryResultRow } from "pg";

import { runQuery } from "@/server/db/client";

type UserRoleRow = QueryResultRow & {
  role: "admin" | "reviewer";
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

export async function userHasRole(userId: string, role: "admin" | "reviewer") {
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
