import { Client } from "pg";
import fs from "fs";
import path from "path";

// Parse .env.local
function parseEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error("Error: .env.local file not found.");
    process.exit(1);
  }
  const envContent = fs.readFileSync(envPath, "utf-8");
  const env: Record<string, string> = {};
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const [key, ...values] = trimmed.split("=");
    env[key.trim()] = values.join("=").trim();
  });
  return env;
}

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

const env = parseEnv();
const connectionString = env.DATABASE_URL;

if (!connectionString) {
  console.error("Error: DATABASE_URL is missing in your .env.local file.");
  process.exit(1);
}

const SQL = `
-- 1. Add background_color column with default value #6B3F2A
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS background_color TEXT NOT NULL DEFAULT '#6B3F2A';

-- 2. Drop constraint if exists and recreate to enforce #RRGGBB format
ALTER TABLE public.products
DROP CONSTRAINT IF EXISTS valid_background_color;

ALTER TABLE public.products
ADD CONSTRAINT valid_background_color
CHECK (background_color ~* '^#[a-f0-9]{6}$');
`;

async function run() {
  console.log("Connecting to Supabase Database to add background_color column...");
  const config = getClientConfig(connectionString);
  const client = new Client(config);
  await client.connect();
  
  try {
    await client.query(SQL);
    console.log("✅ Background color migration executed successfully!");
  } catch (err: any) {
    console.error("❌ Migration failed:", err.message || err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
