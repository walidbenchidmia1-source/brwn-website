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
-- 1. Create ingredients table
CREATE TABLE IF NOT EXISTS public.ingredients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  image_url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;

-- 2. Create product_ingredients liaison table
CREATE TABLE IF NOT EXISTS public.product_ingredients (
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES public.ingredients(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, ingredient_id)
);

ALTER TABLE public.product_ingredients ENABLE ROW LEVEL SECURITY;

-- 3. Setup update trigger for ingredients
CREATE OR REPLACE TRIGGER update_ingredients_updated_at
  BEFORE UPDATE ON public.ingredients
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- 4. RLS policies for ingredients
DROP POLICY IF EXISTS "Allow public read of active ingredients" ON public.ingredients;
CREATE POLICY "Allow public read of active ingredients" ON public.ingredients FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Allow admins to read all ingredients" ON public.ingredients;
CREATE POLICY "Allow admins to read all ingredients" ON public.ingredients FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Allow admins to insert ingredients" ON public.ingredients;
CREATE POLICY "Allow admins to insert ingredients" ON public.ingredients FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Allow admins to update ingredients" ON public.ingredients;
CREATE POLICY "Allow admins to update ingredients" ON public.ingredients FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Allow admins to delete ingredients" ON public.ingredients;
CREATE POLICY "Allow admins to delete ingredients" ON public.ingredients FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- 5. RLS policies for product_ingredients
DROP POLICY IF EXISTS "Allow public read of product_ingredients" ON public.product_ingredients;
CREATE POLICY "Allow public read of product_ingredients" ON public.product_ingredients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_id AND p.is_active = true
    )
  );

DROP POLICY IF EXISTS "Allow admins to select all product_ingredients" ON public.product_ingredients;
CREATE POLICY "Allow admins to select all product_ingredients" ON public.product_ingredients FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Allow admins to insert product_ingredients" ON public.product_ingredients;
CREATE POLICY "Allow admins to insert product_ingredients" ON public.product_ingredients FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Allow admins to update product_ingredients" ON public.product_ingredients;
CREATE POLICY "Allow admins to update product_ingredients" ON public.product_ingredients FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Allow admins to delete product_ingredients" ON public.product_ingredients;
CREATE POLICY "Allow admins to delete product_ingredients" ON public.product_ingredients FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- 6. Storage policies for ingredient-images bucket
DROP POLICY IF EXISTS "Allow public read access to ingredient-images" ON storage.objects;
CREATE POLICY "Allow public read access to ingredient-images" ON storage.objects FOR SELECT
  USING (bucket_id = 'ingredient-images');

DROP POLICY IF EXISTS "Allow admin upload to ingredient-images" ON storage.objects;
CREATE POLICY "Allow admin upload to ingredient-images" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'ingredient-images' AND public.is_admin());

DROP POLICY IF EXISTS "Allow admin update to ingredient-images" ON storage.objects;
CREATE POLICY "Allow admin update to ingredient-images" ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'ingredient-images' AND public.is_admin())
  WITH CHECK (bucket_id = 'ingredient-images' AND public.is_admin());

DROP POLICY IF EXISTS "Allow admin delete to ingredient-images" ON storage.objects;
CREATE POLICY "Allow admin delete to ingredient-images" ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'ingredient-images' AND public.is_admin());

-- 7. Seed initial ingredients
INSERT INTO public.ingredients (name, slug, image_url, is_active)
VALUES
  ('Fraise', 'strawberry', '/images/ingredient_strawberry_transparent.png', true),
  ('Pistache', 'pistachio', '/images/ingredient_pistachio_transparent.png', true),
  ('Mangue', 'mango', '/images/ingredient_mango_transparent.png', true),
  ('Espresso', 'espresso', '/images/ingredient_espresso_transparent.png', true),
  ('Vanille', 'vanilla', '/images/ingredient_vanilla_custom_transparent.png', true),
  ('Chocolat', 'chocolate', '/images/ingredient_chocolate_transparent.png', true),
  ('Mascarpone', 'mascarpone', '/images/ingredient_mascarpone_transparent.png', true),
  ('Cacao', 'cacao', '/images/ingredient_cacao_custom_transparent.png', true),
  ('Biscuit', 'ladyfinger', '/images/ladyfinger.png', true),
  ('Caramel', 'caramel', '/images/ingredient_caramel_transparent.png', true)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    image_url = EXCLUDED.image_url,
    is_active = EXCLUDED.is_active;
`;

async function run() {
  console.log("Connecting to Supabase Database to create Ingredients tables and seed data...");
  const config = getClientConfig(connectionString);
  const client = new Client(config);
  await client.connect();
  
  try {
    await client.query(SQL);
    console.log("✅ Ingredients schema and seeds applied successfully!");
  } catch (err: any) {
    console.error("❌ Ingredients migration failed:", err.message || err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
