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
-- Add badge and button customization columns to products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS badge_text TEXT NOT NULL DEFAULT 'Création',
  ADD COLUMN IF NOT EXISTS badge_bg_color TEXT NOT NULL DEFAULT '#3D2216',
  ADD COLUMN IF NOT EXISTS badge_text_color TEXT NOT NULL DEFAULT '#F9F6F0',
  ADD COLUMN IF NOT EXISTS button_bg_color TEXT NOT NULL DEFAULT '#3D2216',
  ADD COLUMN IF NOT EXISTS button_text_color TEXT NOT NULL DEFAULT '#F9F6F0';

-- Add HEX regex validation check constraints if they do not exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_badge_bg_color'
  ) THEN
    ALTER TABLE public.products ADD CONSTRAINT valid_badge_bg_color CHECK (badge_bg_color ~ '^#[a-fA-F0-9]{6}$');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_badge_text_color'
  ) THEN
    ALTER TABLE public.products ADD CONSTRAINT valid_badge_text_color CHECK (badge_text_color ~ '^#[a-fA-F0-9]{6}$');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_button_bg_color'
  ) THEN
    ALTER TABLE public.products ADD CONSTRAINT valid_button_bg_color CHECK (button_bg_color ~ '^#[a-fA-F0-9]{6}$');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_button_text_color'
  ) THEN
    ALTER TABLE public.products ADD CONSTRAINT valid_button_text_color CHECK (button_text_color ~ '^#[a-fA-F0-9]{6}$');
  END IF;
END $$;
`;

async function run() {
  console.log("Connecting to Supabase Database to add badge and button custom color columns...");
  const config = getClientConfig(connectionString);
  const client = new Client(config);
  await client.connect();
  
  try {
    await client.query(SQL);
    console.log("✅ Custom badge and button columns created and validated in database!");
  } catch (err: any) {
    console.error("❌ Failed to add columns:", err.message || err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
