import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

async function main() {
  // Preview deployments share DATABASE_URL with production unless you give them
  // their own database, so a branch's new migration would change the live data.
  // Set MIGRATE_PREVIEWS=1 on Vercel's Preview environment once previews use a
  // separate database (e.g. a Neon branch).
  const env = process.env.VERCEL_ENV;
  if (env && env !== "production" && process.env.MIGRATE_PREVIEWS !== "1") {
    console.log(`Skipping migrations on a ${env} deployment.`);
    return;
  }

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const pool = new Pool({ connectionString: url, max: 1 });
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  await pool.end();
  console.log("Database is up to date.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
