import fs from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";

const projectRef = "juumpbxhrdautvcckncx";
const dbPassword = "fdU6jRkPEbaeF90e";
const migrationPath = path.join(process.cwd(), "supabase/migrations/001_foundation.sql");

const sql = await fs.readFile(migrationPath, "utf8");

const client = new Client({
  host: `db.${projectRef}.supabase.co`,
  port: 5432,
  database: "postgres",
  user: "postgres",
  password: dbPassword,
  ssl: {
    rejectUnauthorized: false,
  },
});

await client.connect();
try {
  await client.query(sql);
  console.log("Migration applied successfully.");
} finally {
  await client.end();
}
