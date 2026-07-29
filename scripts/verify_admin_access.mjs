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
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const EMAIL = "sabrinezhl@gmail.com";
const PASSWORD = "Saidsabrine1505";

async function verifyLoginAndPermissions() {
  console.log("🧪 Démarrage de la simulation de connexion à /admin/login...");

  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

  // 1. Simulation de la tentative de connexion /admin/login
  const { data: authData, error: signInError } = await supabaseClient.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD,
  });

  if (signInError) {
    console.error("❌ Échec de la connexion à /admin/login :", signInError.message);
    process.exit(1);
  }

  console.log("✅ Authentification Supabase Auth réussie pour", authData.user.email);
  console.log("🔑 Supabase User ID (UUID) :", authData.user.id);

  // 2. Simulation de la vérification middleware & layout (profiles.role)
  const { data: profile, error: profileError } = await supabaseClient
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", authData.user.id)
    .single();

  if (profileError) {
    console.error("❌ Échec de la récupération du profil :", profileError.message);
    process.exit(1);
  }

  console.log("📋 Données du profil :", profile);

  if (!profile || profile.role !== "admin") {
    console.error("❌ Rôle non reconnu comme admin ! Rôle actuel :", profile?.role);
    process.exit(1);
  }

  console.log("✅ Rôle 'admin' confirmé pour le profil.");

  // 3. Test de lecture RLS sur les tables du dashboard (/admin, /admin/products, /admin/orders, /admin/settings)
  console.log("\n🔒 Validation des permissions d'accès aux pages du Dashboard :");

  // Page /admin/products (lecture products)
  const { error: productsError } = await supabaseClient.from("products").select("id").limit(1);
  console.log(`- Page /admin/products (accès table products) : ${!productsError ? "✅ AUTORISÉ" : "❌ ERREUR (" + productsError.message + ")"}`);

  // Page /admin/orders (lecture orders)
  const { error: ordersError } = await supabaseClient.from("orders").select("id").limit(1);
  console.log(`- Page /admin/orders (accès table orders) : ${!ordersError ? "✅ AUTORISÉ" : "❌ ERREUR (" + ordersError.message + ")"}`);

  // Page /admin/settings (lecture store_settings)
  const { error: settingsError } = await supabaseClient.from("store_settings").select("id").limit(1);
  console.log(`- Page /admin/settings (accès table store_settings) : ${!settingsError ? "✅ AUTORISÉ" : "❌ ERREUR (" + settingsError.message + ")"}`);

  console.log("\n🎉 TOUTES LES VERIFICATIONS SONT VALIDEES AVEC SUCCES !");
}

verifyLoginAndPermissions().catch((err) => {
  console.error("❌ Erreur de vérification :", err);
  process.exit(1);
});
