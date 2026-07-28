import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Load environment variables manually from .env.local
const envPath = path.join(__dirname, "../.env.local");
const envContent = fs.readFileSync(envPath, "utf8");
const env: Record<string, string> = {};

envContent.split("\n").forEach((line) => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || "";
    // Remove quotes
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.substring(1, value.length - 1);
    }
    env[key] = value.trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase environment variables in parsed env:", env);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStatus() {
  console.log("--- Supabase Database Status Check ---");

  // Query store settings
  const { data: settings, error: settingsError } = await supabase
    .from("store_settings")
    .select("*")
    .maybeSingle();

  if (settingsError) {
    console.error("Error fetching store_settings:", settingsError);
  } else {
    console.log("Store Settings:", JSON.stringify(settings, null, 2));
  }

  // Query products
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("*");

  if (productsError) {
    console.error("Error fetching products:", productsError);
  } else {
    console.log("\nProducts status:");
    products?.forEach((p) => {
      console.log(`- [${p.is_active ? "ACTIVE" : "INACTIVE"}] ID: ${p.id}, Name: ${p.name}, Slug: ${p.slug}, Stock: ${p.stock_quantity}, Price: ${p.price_cents / 100} CAD`);
    });
  }

  // Query delivery zones
  const { data: zones, error: zonesError } = await supabase
    .from("delivery_zones")
    .select("*");

  if (zonesError) {
    console.error("Error fetching delivery zones:", zonesError);
  } else {
    console.log("\nDelivery zones:");
    console.log(JSON.stringify(zones, null, 2));
  }
}

checkStatus();
