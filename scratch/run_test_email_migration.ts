import { Client } from "pg";
import fs from "fs";
import path from "path";

// Parse .env.local
const envPath = path.join(process.cwd(), ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const env: Record<string, string> = {};
envContent.split("\n").forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return;
  const [key, ...values] = trimmed.split("=");
  env[key.trim()] = values.join("=").trim();
});

function getClientConfig(connectionString: string) {
  const cleanUrl = connectionString.trim();
  const withoutProtocol = cleanUrl.substring(cleanUrl.indexOf("://") + 3);
  const atIndex = withoutProtocol.lastIndexOf("@");
  const credentials = withoutProtocol.substring(0, atIndex);
  const hostPortDb = withoutProtocol.substring(atIndex + 1);

  const colonIndex = credentials.indexOf(":");
  const user = credentials.substring(0, colonIndex);
  const password = credentials.substring(colonIndex + 1);

  const slashIndex = hostPortDb.indexOf("/");
  const hostPort = hostPortDb.substring(0, slashIndex);
  const database = hostPortDb.split("?")[0].substring(slashIndex + 1);

  const portColonIndex = hostPort.indexOf(":");
  const host = portColonIndex !== -1 ? hostPort.substring(0, portColonIndex) : hostPort;
  const port = portColonIndex !== -1 ? parseInt(hostPort.substring(portColonIndex + 1)) : 5432;

  return {
    user,
    password,
    host,
    port,
    database,
    ssl: { rejectUnauthorized: false }
  };
}

const client = new Client(getClientConfig(env.DATABASE_URL));

async function run() {
  console.log("Adding idempotency_key, provider_message_id to email_jobs & environment to orders...");
  await client.connect();
  try {
    await client.query(`
      ALTER TABLE public.email_jobs ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE;
      ALTER TABLE public.email_jobs ADD COLUMN IF NOT EXISTS provider_message_id TEXT;
      ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS environment TEXT DEFAULT 'production';
    `);
    console.log("✅ Email jobs and orders table columns migration applied successfully!");
  } catch (err: any) {
    console.error("❌ Migration error:", err);
  } finally {
    await client.end();
  }
}

run();
