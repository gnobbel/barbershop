import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { pool?: Pool };

function createPool() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return new Pool({ connectionString: url, max: 3 });
}

// Reuse one pool across hot reloads in dev and across invocations of a warm serverless function.
const pool = globalForDb.pool ?? createPool();
globalForDb.pool = pool;

export const db = drizzle(pool, { schema });
export { schema };
