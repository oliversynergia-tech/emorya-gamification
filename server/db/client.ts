import { Pool } from "pg";
import type { QueryResultRow } from "pg";

import { hasDatabaseConfig } from "@/lib/config";

let pool: Pool | null = null;

function shouldUseSsl(connectionString: string) {
  const sslOverride = process.env.DATABASE_SSL;

  if (sslOverride === "true") {
    return true;
  }

  if (sslOverride === "false") {
    return false;
  }

  try {
    const url = new URL(connectionString);
    return !["localhost", "127.0.0.1"].includes(url.hostname);
  } catch {
    return process.env.NODE_ENV === "production";
  }
}

export function getDbPool(): Pool {
  if (!hasDatabaseConfig()) {
    throw new Error("DATABASE_URL is not configured");
  }

  if (!pool) {
    const connectionString = process.env.DATABASE_URL!;
    const useSsl = shouldUseSsl(connectionString);

    pool = new Pool({
      connectionString,
      ssl: useSsl ? { rejectUnauthorized: false } : false,
    });
  }

  return pool;
}

export async function runQuery<T extends QueryResultRow>(text: string, values: unknown[] = []) {
  const db = getDbPool();
  return db.query<T>(text, values);
}
