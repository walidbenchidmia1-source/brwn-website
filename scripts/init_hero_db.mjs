import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "../.env.local");

if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, "utf8");
  for (const line of envConfig.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const parts = trimmed.split("=");
      const key = parts[0].trim();
      let val = parts.slice(1).join("=").trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.substring(1, val.length - 1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ Configuration manquante.");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function checkAndInit() {
  console.log("🔍 Vérification des tables hero_slides et hero_settings...");

  const { data: slides, error: slidesError } = await supabaseAdmin
    .from("hero_slides")
    .select("id")
    .limit(1);

  if (slidesError) {
    console.error("❌ Table public.hero_slides non trouvée :", slidesError.message);
  } else {
    console.log("✅ Table public.hero_slides est disponible dans la base !");
  }

  const { data: settings, error: settingsError } = await supabaseAdmin
    .from("hero_settings")
    .select("id")
    .limit(1);

  if (settingsError) {
    console.error("❌ Table public.hero_settings non trouvée :", settingsError.message);
  } else {
    console.log("✅ Table public.hero_settings est disponible dans la base !");
  }
}

checkAndInit();
