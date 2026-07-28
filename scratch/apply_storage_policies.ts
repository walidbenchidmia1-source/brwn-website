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
-- 1. Policy for public select access (read-only for all visitors)
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
CREATE POLICY "Allow public read access" ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

-- 2. Policy for admins to upload/insert files
DROP POLICY IF EXISTS "Allow admin upload" ON storage.objects;
CREATE POLICY "Allow admin upload" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND public.is_admin());

-- 3. Policy for admins to update files
DROP POLICY IF EXISTS "Allow admin update" ON storage.objects;
CREATE POLICY "Allow admin update" ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'product-images' AND public.is_admin())
  WITH CHECK (bucket_id = 'product-images' AND public.is_admin());

-- 4. Policy for admins to delete files
DROP POLICY IF EXISTS "Allow admin delete" ON storage.objects;
CREATE POLICY "Allow admin delete" ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'product-images' AND public.is_admin());
`;

async function run() {
  console.log("Connecting to Supabase Database to apply Storage Policies...");
  const config = getClientConfig(connectionString);
  const client = new Client(config);
  await client.connect();
  
  try {
    await client.query(SQL);
    console.log("✅ Supabase Storage Policies applied successfully!");
  } catch (err: any) {
    console.error("❌ Failed to apply storage policies:", err.message || err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
