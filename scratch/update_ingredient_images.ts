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

async function run() {
  console.log("Connecting to Supabase Database to update ingredient image paths...");
  const config = getClientConfig(connectionString);
  const client = new Client(config);
  await client.connect();
  
  try {
    // 1. Fetch current ingredients
    const { rows: current } = await client.query("SELECT id, name, slug, image_url FROM ingredients;");
    console.log("Current ingredients in DB:", current);
    
    // We want to map slugs or names:
    // - Caramel: slug 'caramel'
    // - Pistache: slug 'pistachio' or 'pistache'
    // - Chocolat: slug 'chocolate' or 'chocolat'
    
    // Let's perform updates
    const updates = [
      { slug: "caramel", path: "/images/ingredient_caramel_transparent.png" },
      { slug: "pistachio", path: "/images/ingredient_pistachio_transparent.png" },
      { slug: "chocolate", path: "/images/ingredient_chocolate_transparent.png" }
    ];
    
    for (const update of updates) {
      const res = await client.query(
        "UPDATE ingredients SET image_url = $1 WHERE slug = $2 RETURNING id, name, slug, image_url;",
        [update.path, update.slug]
      );
      if (res.rowCount && res.rowCount > 0) {
        console.log(`✅ Updated ${update.slug} image path to: ${update.path}`);
      } else {
        console.log(`⚠️ Ingredient with slug '${update.slug}' not found in DB.`);
      }
    }
  } catch (err: any) {
    console.error("❌ Failed to update image paths:", err.message || err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
