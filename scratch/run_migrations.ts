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

// Robust database parser to support passwords with '@' and other special characters
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
-- =========================================================================
-- 1. TABLE DES PROFILS UTILISATEURS (Liée à auth.users de Supabase)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'customer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  CONSTRAINT valid_role CHECK (role IN ('admin', 'customer'))
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- 2. FONCTIONS DE SÉCURITÉ DE RÔLE (SECURITY DEFINER avec search_path vide)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    coalesce(NEW.raw_user_meta_data->>'full_name', ''),
    'customer'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Trigger update checking with bypass support for database superusers and service_role tokens
CREATE OR REPLACE FUNCTION public.check_profile_update()
RETURNS TRIGGER AS $$
DECLARE
  v_jwt_role TEXT;
BEGIN
  BEGIN
    v_jwt_role := pg_catalog.current_setting('request.jwt.claims', true)::json->>'role';
  EXCEPTION WHEN OTHERS THEN
    v_jwt_role := NULL;
  END;

  IF v_jwt_role = 'service_role' OR public.is_admin() OR current_user = 'postgres' THEN
    RETURN NEW;
  END IF;

  IF NEW.id <> OLD.id OR NEW.role <> OLD.role OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'Permission denied: Standard users can only update their full_name';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE TRIGGER enforce_profile_update_rules
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.check_profile_update();

-- =========================================================================
-- 3. TABLE DES PRODUITS (Tiramisus)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'available',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  CONSTRAINT price_non_negative CHECK (price_cents >= 0),
  CONSTRAINT stock_non_negative CHECK (stock_quantity >= 0),
  CONSTRAINT low_stock_non_negative CHECK (low_stock_threshold >= 0),
  CONSTRAINT valid_status CHECK (status IN ('available', 'out_of_stock'))
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.sync_product_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stock_quantity = 0 THEN
    NEW.status := 'out_of_stock';
  ELSE
    NEW.status := 'available';
  END if;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE TRIGGER sync_product_status_trigger
  BEFORE INSERT OR UPDATE OF stock_quantity ON public.products
  FOR EACH ROW EXECUTE PROCEDURE public.sync_product_status();

CREATE OR REPLACE FUNCTION public.prevent_direct_stock_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.stock_quantity <> NEW.stock_quantity THEN
    IF pg_catalog.current_setting('app.inventory_adjustment_active', true) IS DISTINCT FROM 'true' THEN
      RAISE EXCEPTION 'Direct update of stock_quantity is not allowed. Use public.adjust_product_stock instead.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE TRIGGER block_direct_stock_update
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_direct_stock_update();

-- =========================================================================
-- 4. TABLE D'HISTORIQUE DE L'INVENTAIRE (Audit Trail)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.inventory_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products ON DELETE RESTRICT NOT NULL,
  previous_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  reason TEXT,
  modified_by UUID REFERENCES public.profiles ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.inventory_history ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- 5. INDEXATIONS
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_inventory_history_product_id ON public.inventory_history(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_history_created_at ON public.inventory_history(created_at DESC);

-- =========================================================================
-- 6. FONCTION TRANSACTIONNELLE D'AJUSTEMENT DES STOCKS (RPC)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.adjust_product_stock(
  p_product_id UUID,
  p_quantity_change INTEGER,
  p_reason TEXT
)
RETURNS VOID AS $$
DECLARE
  v_prev_qty INTEGER;
  v_new_qty INTEGER;
  v_is_admin BOOLEAN;
BEGIN
  -- 1. Verify admin
  SELECT (role = 'admin') INTO v_is_admin FROM public.profiles WHERE id = auth.uid();
  IF v_is_admin IS NOT TRUE THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  -- 2. Enable session variable
  PERFORM pg_catalog.set_config('app.inventory_adjustment_active', 'true', true);

  -- 3. Lock row
  SELECT stock_quantity INTO v_prev_qty
  FROM public.products
  WHERE id = p_product_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found';
  END IF;
  
  v_new_qty := v_prev_qty + p_quantity_change;
  
  IF v_new_qty < 0 THEN
    RAISE EXCEPTION 'Stock quantity cannot be negative';
  END IF;
  
  UPDATE public.products
  SET stock_quantity = v_new_qty
  WHERE id = p_product_id;
  
  INSERT INTO public.inventory_history (product_id, previous_quantity, new_quantity, reason, modified_by)
  VALUES (p_product_id, v_prev_qty, v_new_qty, p_reason, auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- =========================================================================
-- 7. PERMISSIONS & RÉVOCATIONS
-- =========================================================================
REVOKE EXECUTE ON FUNCTION public.adjust_product_stock(UUID, INTEGER, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.adjust_product_stock(UUID, INTEGER, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.adjust_product_stock(UUID, INTEGER, TEXT) TO authenticated;

-- =========================================================================
-- 8. RLS POLICIES
-- =========================================================================

-- PRODUCTS
DROP POLICY IF EXISTS "Allow public read-only of active products" ON public.products;
CREATE POLICY "Allow public read-only of active products" 
  ON public.products FOR SELECT 
  USING (is_active = true);

DROP POLICY IF EXISTS "Allow admins to select all products" ON public.products;
CREATE POLICY "Allow admins to select all products" 
  ON public.products FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
CREATE POLICY "Admins can insert products" 
  ON public.products FOR INSERT 
  TO authenticated 
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update products" ON public.products;
CREATE POLICY "Admins can update products" 
  ON public.products FOR UPDATE 
  TO authenticated 
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete products" ON public.products;
CREATE POLICY "Admins can delete products" 
  ON public.products FOR DELETE 
  TO authenticated 
  USING (public.is_admin());

-- PROFILES
DROP POLICY IF EXISTS "Allow users to read their own profile" ON public.profiles;
CREATE POLICY "Allow users to read their own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Allow admins to read all profiles" ON public.profiles;
CREATE POLICY "Allow admins to read all profiles" 
  ON public.profiles FOR SELECT 
  USING (public.is_admin());

DROP POLICY IF EXISTS "Allow users to update own name" ON public.profiles;
CREATE POLICY "Allow users to update own name" 
  ON public.profiles FOR UPDATE 
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Allow admins to update profiles" ON public.profiles;
CREATE POLICY "Allow admins to update profiles" 
  ON public.profiles FOR UPDATE 
  TO authenticated
  USING (public.is_admin());

-- INVENTORY_HISTORY
DROP POLICY IF EXISTS "Allow admins to read inventory history" ON public.inventory_history;
CREATE POLICY "Allow admins to read inventory history" 
  ON public.inventory_history FOR SELECT 
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Allow admins to insert inventory history" ON public.inventory_history;
CREATE POLICY "Allow admins to insert inventory history" 
  ON public.inventory_history FOR INSERT 
  TO authenticated
  WITH CHECK (public.is_admin());
`;

async function run() {
  console.log("Connecting to Supabase Database...");
  const config = getClientConfig(connectionString);
  const client = new Client(config);
  await client.connect();
  
  try {
    console.log("Running migrations...");
    await client.query(SQL);
    console.log("✅ SQL Migrations completed successfully!");
  } catch (err: any) {
    console.error("❌ Migration failed:", err.message || err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
