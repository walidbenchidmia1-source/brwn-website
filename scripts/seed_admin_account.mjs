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

const TARGET_EMAIL = "sabrinezhl@gmail.com";
const TARGET_PASSWORD = "Saidsabrine1505";
const TARGET_FULL_NAME = "Sabrine ZHL";

async function main() {
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // 1. Recherche de l'utilisateur par e-mail
  console.log(`🔍 Vérification de l'existence du compte ${TARGET_EMAIL}...`);
  const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers();

  if (listError) {
    console.error("❌ Erreur lors du listage des utilisateurs Auth:", listError.message);
    process.exit(1);
  }

  const existingUser = listData.users.find(
    (u) => u.email?.toLowerCase() === TARGET_EMAIL.toLowerCase()
  );

  let userId;
  let actionType = "";

  if (existingUser) {
    actionType = "EXISTANT_MIS_A_JOUR";
    console.log(`ℹ️ Compte existant trouvé (ID: ${existingUser.id}).`);
    userId = existingUser.id;

    // Métadonnées mises à jour sans changer le mot de passe
    const updatedMetadata = {
      ...(existingUser.user_metadata || {}),
      role: "admin",
      full_name: existingUser.user_metadata?.full_name || TARGET_FULL_NAME,
    };

    console.log("🔄 Mise à jour des métadonnées du compte vers le rôle admin...");
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: updatedMetadata,
      email_confirm: true,
    });

    if (updateError) {
      console.error("❌ Erreur lors de la mise à jour des metadata utilisateur:", updateError.message);
      process.exit(1);
    }
  } else {
    actionType = "CREE";
    console.log(`➕ Compte non trouvé. Création d'un nouvel utilisateur administrateur avec email_confirm: true...`);
    const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: TARGET_EMAIL,
      password: TARGET_PASSWORD,
      email_confirm: true,
      user_metadata: {
        role: "admin",
        full_name: TARGET_FULL_NAME,
      },
    });

    if (createError) {
      console.error("❌ Erreur lors de la création de l'utilisateur:", createError.message);
      process.exit(1);
    }

    userId = createData.user.id;
    console.log(`✅ Utilisateur créé avec succès via l'Admin API (ID: ${userId}).`);
  }

  // 2. Tester l'upsert dans public.profiles avec id, full_name, role
  console.log(`📝 Upsert idempotent dans public.profiles pour l'utilisateur ${userId}...`);
  
  // Essayer d'abord avec (id, full_name, role)
  let profilePayload = {
    id: userId,
    full_name: TARGET_FULL_NAME,
    role: "admin",
  };

  let { data: profileData, error: profileError } = await supabaseAdmin
    .from("profiles")
    .upsert(profilePayload, { onConflict: "id" })
    .select()
    .single();

  // Si une colonne manque ou erreur, essayer d'inclure les champs compatibles
  if (profileError && profileError.message.includes("column")) {
    console.log("⚠️ Ajustement du payload profiles selon le schéma Supabase...");
    profilePayload = { id: userId, role: "admin" };
    const res = await supabaseAdmin
      .from("profiles")
      .upsert(profilePayload, { onConflict: "id" })
      .select()
      .single();
    profileData = res.data;
    profileError = res.error;
  }

  if (profileError) {
    console.error("❌ Erreur lors de l'upsert dans public.profiles:", profileError.message);
    process.exit(1);
  }

  console.log("\n========================================================");
  console.log("📊 RAPPORT D'EXECUTION SEED ADMIN");
  console.log("========================================================");
  console.log(`- Compte Administrateur : ${TARGET_EMAIL}`);
  console.log(`- Statut Compte : ${actionType}`);
  console.log(`- Supabase User ID (UUID) : ${userId}`);
  console.log(`- Ligne public.profiles :`, JSON.stringify(profileData, null, 2));
  console.log(`- Validation du Rôle Admin : ${profileData.role === 'admin' ? '✅ VALIDE (role = admin)' : '❌ INVALIDE'}`);
  console.log("========================================================\n");
}

main().catch((err) => {
  console.error("❌ Erreur inattendue:", err);
  process.exit(1);
});
