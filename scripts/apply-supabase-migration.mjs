import fs from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";

// Usage: node scripts/apply-supabase-migration.mjs <migration-file>
// Reads SUPABASE_DB_PASSWORD from .env.local (gitignored) — never pass the password on
// the command line. Connects via the eu-west-1 session pooler (direct db.<ref> host does
// not resolve on some networks).

const projectRef = "juumpbxhrdautvcckncx";

async function loadEnvPassword() {
  if (process.env.SUPABASE_DB_PASSWORD) return process.env.SUPABASE_DB_PASSWORD;
  try {
    const raw = await fs.readFile(path.join(process.cwd(), ".env.local"), "utf8");
    const line = raw.split("\n").find((l) => l.startsWith("SUPABASE_DB_PASSWORD="));
    if (line) return line.slice("SUPABASE_DB_PASSWORD=".length).trim();
  } catch {
    /* ignore */
  }
  throw new Error("SUPABASE_DB_PASSWORD not set in env or .env.local");
}

const fileArg = process.argv[2];
if (!fileArg) throw new Error("Provide a migration file path as the first argument.");

const migrationPath = path.isAbsolute(fileArg) ? fileArg : path.join(process.cwd(), fileArg);
const sql = await fs.readFile(migrationPath, "utf8");
const password = await loadEnvPassword();

const client = new Client({
  host: "aws-0-eu-west-1.pooler.supabase.com",
  port: 5432,
  database: "postgres",
  user: `postgres.${projectRef}`,
  password,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

await client.connect();
try {
  await client.query(sql);
  console.log(`Migration applied: ${path.basename(migrationPath)}`);
} finally {
  await client.end();
}
