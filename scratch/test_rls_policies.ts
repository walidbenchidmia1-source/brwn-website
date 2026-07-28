import { createClient } from "@supabase/supabase-js";
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

const env = parseEnv();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
  console.error("Error: Supabase URL or Anon Key is missing in .env.local file.");
  process.exit(1);
}

async function runRlsTests() {
  console.log("=========================================================================");
  console.log("RUNNING ROW LEVEL SECURITY (RLS) POLICIES TESTS");
  console.log("=========================================================================");

  // Create client simulating public anonymous user
  const supabase = createClient(supabaseUrl, anonKey);

  try {
    // 1. Check anonymous SELECT permissions
    console.log("Checking SELECT permission on store_settings (anonymous)...");
    const { data: settings, error: settingsError } = await supabase
      .from("store_settings")
      .select("*")
      .limit(1);

    if (settingsError) {
      console.log(`❌ Failed to read store_settings as public: ${settingsError.message}`);
      throw settingsError;
    }
    console.log("✅ Successfully read store_settings as public user.");

    // 2. Check anonymous INSERT block on store_settings
    console.log("Checking blocked INSERT on store_settings (anonymous)...");
    const { error: insertSettingsError } = await supabase
      .from("store_settings")
      .insert([{ id: "rls-test", min_order_cents: 99999 }]);

    if (insertSettingsError) {
      console.log(`✅ Successfully blocked insert into store_settings. Error: ${insertSettingsError.message}`);
    } else {
      throw new Error("FAIL: Public anonymous user was allowed to insert into store_settings!");
    }

    // 3. Check anonymous INSERT block on orders
    console.log("Checking blocked INSERT on orders (anonymous)...");
    const { error: insertOrderError } = await supabase
      .from("orders")
      .insert([{
        order_number: "BRWN-RLS-TEST",
        checkout_attempt_id: crypto.randomUUID(),
        customer_first_name: "RLS",
        customer_last_name: "Test",
        customer_email: "rls@test.com",
        customer_phone: "5140000000",
        fulfillment_type: "pickup",
        service_date: "2029-05-20",
        availability_slot_id: crypto.randomUUID(), // invalid slot but should fail RLS first
        subtotal_cents: 1000,
        total_cents: 1000,
        payment_method: "on_pickup",
        payment_status: "pending",
        terms_accepted_at: new Date().toISOString(),
        allergen_notice_accepted_at: new Date().toISOString(),
        cart_fingerprint: "rls"
      }]);

    if (insertOrderError) {
      console.log(`✅ Successfully blocked insert into orders. Error: ${insertOrderError.message}`);
    } else {
      throw new Error("FAIL: Public anonymous user was allowed to insert into orders table directly!");
    }

    console.log("=========================================================================");
    console.log("🎉 ALL ROW LEVEL SECURITY (RLS) POLICIES TESTS PASSED SUCCESSFULLY!");
    console.log("=========================================================================");

  } catch (err: any) {
    console.error("❌ RLS TESTS FAILED:", err.message || err);
    process.exit(1);
  }
}

runRlsTests();
