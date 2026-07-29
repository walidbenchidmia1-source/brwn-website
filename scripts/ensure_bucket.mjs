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

async function ensureBucket() {
  console.log("⚡ Vérification / Création du bucket Supabase Storage 'hero-images'...");

  const { data: bucket, error: getError } = await supabaseAdmin.storage.getBucket("hero-images");

  if (getError || !bucket) {
    console.log("🔨 Création du bucket public 'hero-images' via l'Admin API...");
    const { data: createData, error: createError } = await supabaseAdmin.storage.createBucket("hero-images", {
      public: true,
      fileSizeLimit: 8388608, // 8 Mo
      allowedMimeTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/avif", "video/mp4", "video/webm"],
    });

    if (createError) {
      console.error("❌ Échec de la création du bucket :", createError.message);
      process.exit(1);
    }
    console.log("✅ Bucket 'hero-images' créé avec succès !");
  } else {
    console.log("✅ Le bucket 'hero-images' existe déjà et est prêt !");
  }
}

ensureBucket();
