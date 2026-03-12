import { Pool } from "pg";
import type { QueryResultRow } from "pg";

import { hasDatabaseConfig } from "@/lib/config";

let pool: Pool | null = null;

export function getDbPool(): Pool {
  if (!hasDatabaseConfig()) {
    throw new Error("DATABASE_URL is not configured");
  }

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
    });
  }

  return pool;
}

export async function runQuery<T extends QueryResultRow>(text: string, values: unknown[] = []) {
  const db = getDbPool();
  return db.query<T>(text, values);
}
