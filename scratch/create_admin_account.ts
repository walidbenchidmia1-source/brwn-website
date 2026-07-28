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
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const adminAuthClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const adminEmail = "walidbenchidmia1@gmail.com";
const tempPassword = "BRWNTiramisuAdmin2026!";

async function run() {
  console.log("====================================================");
  console.log("     ADMIN ACCOUNT PROMOTION & USER CLEANUP         ");
  console.log("====================================================\n");

  try {
    // 1. Check if user already exists
    console.log(`Checking if user "${adminEmail}" already exists...`);
    const { data: usersData, error: listError } = await adminAuthClient.auth.admin.listUsers();
    if (listError) throw new Error("Failed to list users: " + listError.message);

    const existingUser = usersData.users.find(u => u.email === adminEmail);
    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
      console.log(`User already exists (ID: ${userId}). Promoting to admin role...`);
    } else {
      console.log("User does not exist. Creating new user account...");
      const { data: createData, error: createError } = await adminAuthClient.auth.admin.createUser({
        email: adminEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: "Walid Ben Chidmia" }
      });
      if (createError || !createData.user) {
        throw new Error("Failed to create admin user: " + createError?.message);
      }
      userId = createData.user.id;
      console.log(`✅ Account created successfully (ID: ${userId}).`);
      console.log(`👉 Temporary Password set to: ${tempPassword}`);
    }

    // 2. Elevate role in profiles table
    const { error: profileError } = await adminAuthClient
      .from("profiles")
      .update({ role: "admin", full_name: "Walid Ben Chidmia" })
      .eq("id", userId);

    if (profileError) throw new Error("Failed to update profile to admin: " + profileError.message);
    console.log(`✅ Profile elevated to 'admin' in profiles table.`);

    // 3. Cleanup lingering test users
    console.log("\nCleaning up any lingering test accounts...");
    let cleanupCount = 0;
    for (const user of usersData.users) {
      const email = user.email || "";
      if (email.startsWith("test-customer-") || email.startsWith("test-admin-")) {
        console.log(`Deleting test user: ${email} (${user.id})...`);
        const { error: deleteErr } = await adminAuthClient.auth.admin.deleteUser(user.id);
        if (deleteErr) {
          console.warn(`   - Warning: Could not delete ${email}: ${deleteErr.message}`);
        } else {
          cleanupCount++;
        }
      }
    }
    console.log(`✅ Cleanup completed. ${cleanupCount} test user(s) deleted.`);

  } catch (err: any) {
    console.error("❌ Operation failed:", err.message || err);
  }
}

run();
