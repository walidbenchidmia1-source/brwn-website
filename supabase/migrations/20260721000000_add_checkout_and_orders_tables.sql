-- =========================================================================
-- 1. CRÉATION DU SCHÉMA PRIVE
-- =========================================================================
CREATE SCHEMA IF NOT EXISTS private;

-- =========================================================================
-- 2. SEQUENCES & CONFIGURATIONS FASCALES PAR DEFAUT
-- =========================================================================
CREATE SEQUENCE IF NOT EXISTS public.orders_seq START WITH 10001;

-- =========================================================================
-- 3. TABLES DE CONFIGURATION & DÉLIVRABILITÉ
-- =========================================================================

-- TABLE DES REGLES DE LA BOUTIQUE (store_settings)
CREATE TABLE IF NOT EXISTS public.store_settings (
  id TEXT PRIMARY KEY,
  pickup_address TEXT NOT NULL DEFAULT '123 Rue de Tiramisu, Montréal, QC',
  pickup_instructions TEXT NOT NULL DEFAULT 'Veuillez vous présenter au comptoir avec votre numéro de commande.',
  preparation_delay_hours INTEGER NOT NULL DEFAULT 24 CONSTRAINT check_preparation_delay CHECK (preparation_delay_hours >= 0),
  min_order_cents INTEGER NOT NULL DEFAULT 1500 CONSTRAINT check_min_order CHECK (min_order_cents >= 0),
  free_delivery_min_cents INTEGER NOT NULL DEFAULT 5000 CONSTRAINT check_free_delivery CHECK (free_delivery_min_cents >= 0),
  tax_rate_gst NUMERIC NOT NULL DEFAULT 0.05 CONSTRAINT check_gst_rate CHECK (tax_rate_gst >= 0),
  tax_rate_qst NUMERIC NOT NULL DEFAULT 0.09975 CONSTRAINT check_qst_rate CHECK (tax_rate_qst >= 0),
  stripe_enabled BOOLEAN NOT NULL DEFAULT true,
  cod_enabled BOOLEAN NOT NULL DEFAULT true,
  cop_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- TABLE DES ZONES DE LIVRAISON (delivery_zones)
CREATE TABLE IF NOT EXISTS public.delivery_zones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  postal_code_prefixes TEXT[] NOT NULL,
  delivery_fee_cents INTEGER NOT NULL DEFAULT 500 CONSTRAINT check_delivery_fee CHECK (delivery_fee_cents >= 0),
  min_order_cents INTEGER NOT NULL DEFAULT 1500 CONSTRAINT check_zone_min_order CHECK (min_order_cents >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- TABLE DES CODES PROMOTIONNELS (promo_codes)
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value INTEGER NOT NULL CONSTRAINT check_discount_value CHECK (discount_value >= 0),
  min_order_cents INTEGER NOT NULL DEFAULT 0 CONSTRAINT check_promo_min_order CHECK (min_order_cents >= 0),
  max_discount_cents INTEGER CONSTRAINT check_max_discount CHECK (max_discount_cents IS NULL OR max_discount_cents >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  max_uses INTEGER CONSTRAINT check_max_uses CHECK (max_uses IS NULL OR max_uses > 0),
  uses_count INTEGER NOT NULL DEFAULT 0 CONSTRAINT check_uses_count CHECK (uses_count >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- TABLE DES PLAGES HORAIRES (availability_slots)
CREATE TABLE IF NOT EXISTS public.availability_slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  time_slot TEXT NOT NULL,
  max_orders INTEGER NOT NULL DEFAULT 10 CONSTRAINT check_max_orders CHECK (max_orders > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- TABLE DES DATES FERMEES (closed_dates)
CREATE TABLE IF NOT EXISTS public.closed_dates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  closed_date DATE UNIQUE NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================================
-- 4. TABLES DES COMMANDES, ARTICLES ET ROULEMENT DE CODES PROMO
-- =========================================================================

-- TABLE DES COMMANDES (orders)
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  checkout_attempt_id TEXT UNIQUE NOT NULL,
  public_token UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  customer_first_name TEXT NOT NULL,
  customer_last_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  fulfillment_type TEXT NOT NULL CHECK (fulfillment_type IN ('delivery', 'pickup')),
  delivery_address TEXT,
  delivery_apartment TEXT,
  delivery_city TEXT,
  delivery_province TEXT DEFAULT 'Québec',
  delivery_postal_code TEXT,
  delivery_instructions TEXT,
  order_notes TEXT,
  service_date DATE NOT NULL,
  availability_slot_id UUID REFERENCES public.availability_slots(id) ON DELETE RESTRICT NOT NULL,
  slot_reserved_at TIMESTAMP WITH TIME ZONE,
  slot_hold_expires_at TIMESTAMP WITH TIME ZONE,
  slot_released_at TIMESTAMP WITH TIME ZONE,
  subtotal_cents INTEGER NOT NULL CONSTRAINT check_subtotal CHECK (subtotal_cents >= 0),
  discount_cents INTEGER NOT NULL DEFAULT 0 CONSTRAINT check_discount CHECK (discount_cents >= 0),
  delivery_fee_cents INTEGER NOT NULL DEFAULT 0 CONSTRAINT check_order_delivery_fee CHECK (delivery_fee_cents >= 0),
  gst_amount_cents INTEGER NOT NULL DEFAULT 0 CONSTRAINT check_gst CHECK (gst_amount_cents >= 0),
  qst_amount_cents INTEGER NOT NULL DEFAULT 0 CONSTRAINT check_qst CHECK (qst_amount_cents >= 0),
  total_cents INTEGER NOT NULL CONSTRAINT check_total CHECK (total_cents >= 0),
  refunded_amount_cents INTEGER NOT NULL DEFAULT 0 CONSTRAINT check_refunded CHECK (refunded_amount_cents >= 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('stripe', 'on_delivery', 'on_pickup')),
  payment_status TEXT NOT NULL CHECK (payment_status IN ('pending', 'requires_action', 'paid', 'failed', 'cancelled', 'partially_refunded', 'refunded', 'cash_on_delivery', 'pay_on_pickup', 'test')),
  fulfillment_status TEXT NOT NULL DEFAULT 'pending' CHECK (fulfillment_status IN ('pending', 'confirmed', 'in_preparation', 'ready', 'out_for_delivery', 'completed', 'cancelled')),
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_latest_charge_id TEXT,
  stripe_refund_id TEXT,
  last_payment_error_code TEXT,
  last_payment_error_message TEXT,
  paid_at TIMESTAMP WITH TIME ZONE,
  refunded_at TIMESTAMP WITH TIME ZONE,
  promo_code_id UUID REFERENCES public.promo_codes(id) ON DELETE SET NULL,
  terms_accepted_at TIMESTAMP WITH TIME ZONE NOT NULL,
  allergen_notice_accepted_at TIMESTAMP WITH TIME ZONE NOT NULL,
  terms_version TEXT NOT NULL DEFAULT '1.0',
  allergen_notice_version TEXT NOT NULL DEFAULT '1.0',
  confirmation_email_sent_at TIMESTAMP WITH TIME ZONE,
  admin_notification_sent_at TIMESTAMP WITH TIME ZONE,
  cart_fingerprint TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  CONSTRAINT check_discount_limit CHECK (discount_cents <= subtotal_cents),
  CONSTRAINT check_refund_limit CHECK (refunded_amount_cents <= total_cents)
);

-- TABLE DE LIAISON DES CODES PROMOS UTILISES (promo_code_redemptions)
CREATE TABLE IF NOT EXISTS public.promo_code_redemptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  promo_code_id UUID REFERENCES public.promo_codes(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  checkout_attempt_id TEXT UNIQUE NOT NULL,
  normalized_client_email TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('reserved', 'confirmed', 'released', 'expired')),
  reserved_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  released_at TIMESTAMP WITH TIME ZONE
);

-- TABLE DES ARTICLES DE COMMANDE (order_items)
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT NOT NULL,
  quantity INTEGER NOT NULL CONSTRAINT check_item_quantity CHECK (quantity > 0),
  unit_price_cents INTEGER NOT NULL CONSTRAINT check_item_unit_price CHECK (unit_price_cents >= 0),
  line_total_cents INTEGER NOT NULL CONSTRAINT check_item_line_total CHECK (line_total_cents >= 0),
  flavor TEXT NOT NULL,
  format TEXT NOT NULL,
  allergens_snapshot TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
  tax_category_snapshot TEXT NOT NULL DEFAULT 'taxable'
);

-- =========================================================================
-- 5. TABLES INTERNES DE LOGS, AUDITS ET JOBS
-- =========================================================================

-- LOGS WEBHOOK STRIPE POUR DEDUPLICATION (stripe_events)
CREATE TABLE IF NOT EXISTS public.stripe_events (
  stripe_event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- HISTORIQUE D'AUDIT ADMIN (admin_audit_logs)
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  amount_cents INTEGER,
  modified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- FILE D'ATTENTE DE TACHES E-MAILS (email_jobs)
CREATE TABLE IF NOT EXISTS public.email_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  email_type TEXT NOT NULL,
  recipient TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'dead')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CONSTRAINT check_attempt_count CHECK (attempt_count >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 5 CONSTRAINT check_max_attempts CHECK (max_attempts > 0),
  locked_at TIMESTAMP WITH TIME ZONE,
  locked_by TEXT,
  next_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_error TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================================
-- 6. AJUSTEMENTS FISCAUX ET ALLERGENES SUR LA TABLE PRODUITS
-- =========================================================================
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tax_category TEXT NOT NULL DEFAULT 'taxable';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS gst_rate NUMERIC DEFAULT 0.05 CONSTRAINT check_product_gst CHECK (gst_rate >= 0);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS qst_rate NUMERIC DEFAULT 0.09975 CONSTRAINT check_product_qst CHECK (qst_rate >= 0);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_zero_rated BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS allergens TEXT[] DEFAULT ARRAY[]::text[];

-- =========================================================================
-- 7. FONCTIONS SÉCURISÉES DANS LE SCHÉMA PRIVE (private)
-- =========================================================================

-- A. FONCTION DE RESERVATION DE CRENEAU
DROP FUNCTION IF EXISTS private.check_and_reserve_slot(UUID, DATE, TEXT, TEXT, UUID, INTEGER, BOOLEAN);
DROP FUNCTION IF EXISTS private.check_and_reserve_slot(UUID, DATE, TEXT, UUID, UUID, INTEGER, BOOLEAN);

CREATE OR REPLACE FUNCTION private.check_and_reserve_slot(
  p_availability_slot_id UUID,
  p_service_date DATE,
  p_fulfillment_type TEXT,
  p_checkout_attempt_id TEXT,
  p_order_id UUID,
  p_hold_duration_minutes INT,
  p_is_temporary BOOLEAN
) RETURNS BOOLEAN AS $$
DECLARE
  v_max_orders INT;
  v_active_orders_count INT;
  v_is_active BOOLEAN;
  v_day_of_week INT;
  v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Lock slot configuration row to prevent concurrent booking race conditions
  SELECT max_orders, is_active, day_of_week INTO v_max_orders, v_is_active, v_day_of_week
  FROM public.availability_slots
  WHERE id = p_availability_slot_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Availability slot not found';
  END IF;

  IF v_is_active IS NOT TRUE THEN
    RAISE EXCEPTION 'Availability slot is not active';
  END IF;

  -- Verify day of week match
  IF extract(dow from p_service_date) <> v_day_of_week THEN
    RAISE EXCEPTION 'Selected service date does not match the day of week of this slot';
  END IF;

  -- Verify closed dates
  IF EXISTS (SELECT 1 FROM public.closed_dates WHERE closed_date = p_service_date) THEN
    RAISE EXCEPTION 'The selected date is closed';
  END IF;

  -- Calculate active capacity (ignoring expired temporary holds and cancelled orders)
  SELECT COUNT(*) INTO v_active_orders_count
  FROM public.orders
  WHERE availability_slot_id = p_availability_slot_id
    AND service_date = p_service_date
    AND fulfillment_status <> 'cancelled'
    AND (
      slot_hold_expires_at IS NULL
      OR slot_hold_expires_at > now()
    );

  IF v_active_orders_count >= v_max_orders THEN
    RETURN FALSE;
  END IF;

  -- Determine hold expiration timestamp
  IF p_is_temporary THEN
    v_expires_at := now() + (p_hold_duration_minutes || ' minutes')::interval;
  ELSE
    v_expires_at := NULL;
  END IF;

  -- Update order slot properties if order already exists, otherwise caller inserts
  IF p_order_id IS NOT NULL THEN
    UPDATE public.orders
    SET availability_slot_id = p_availability_slot_id,
        service_date = p_service_date,
        slot_reserved_at = now(),
        slot_hold_expires_at = v_expires_at,
        slot_released_at = NULL
    WHERE id = p_order_id;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- B. FONCTION DE RESERVATION DE CODE PROMO
DROP FUNCTION IF EXISTS private.reserve_promo_code(UUID, UUID, TEXT, TEXT, BOOLEAN, INTEGER);
DROP FUNCTION IF EXISTS private.reserve_promo_code(UUID, UUID, UUID, TEXT, INTEGER);

CREATE OR REPLACE FUNCTION private.reserve_promo_code(
  p_code_id UUID,
  p_order_id UUID,
  p_checkout_attempt_id TEXT,
  p_client_email TEXT,
  p_is_temporary BOOLEAN,
  p_hold_duration_minutes INT
) RETURNS BOOLEAN AS $$
DECLARE
  v_max_uses INT;
  v_min_order INT;
  v_is_active BOOLEAN;
  v_start_date TIMESTAMP WITH TIME ZONE;
  v_end_date TIMESTAMP WITH TIME ZONE;
  v_confirmed_count INT;
  v_reserved_count INT;
  v_normalized_email TEXT;
  v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  v_normalized_email := lower(trim(p_client_email));

  -- Lock promo code configuration row to prevent concurrent usage limit race conditions
  SELECT max_uses, min_order_cents, is_active, start_date, end_date INTO v_max_uses, v_min_order, v_is_active, v_start_date, v_end_date
  FROM public.promo_codes
  WHERE id = p_code_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Promo code not found';
  END IF;

  IF v_is_active IS NOT TRUE THEN
    RAISE EXCEPTION 'Promo code is not active';
  END IF;

  IF v_start_date IS NOT NULL AND v_start_date > now() THEN
    RAISE EXCEPTION 'Promo code is not yet valid';
  END IF;

  IF v_end_date IS NOT NULL AND v_end_date < now() THEN
    RAISE EXCEPTION 'Promo code has expired';
  END IF;

  -- Check if client already has a confirmed redemption
  IF EXISTS (
    SELECT 1 FROM public.promo_code_redemptions
    WHERE promo_code_id = p_code_id
      AND normalized_client_email = v_normalized_email
      AND status = 'confirmed'
  ) THEN
    RAISE EXCEPTION 'Promo code already used by this customer';
  END IF;

  -- Calculate current active capacity (confirmed uses + non-expired holds)
  SELECT COUNT(*) INTO v_confirmed_count
  FROM public.promo_code_redemptions
  WHERE promo_code_id = p_code_id AND status = 'confirmed';

  SELECT COUNT(*) INTO v_reserved_count
  FROM public.promo_code_redemptions
  WHERE promo_code_id = p_code_id AND status = 'reserved' AND expires_at > now();

  IF v_max_uses IS NOT NULL AND (v_confirmed_count + v_reserved_count) >= v_max_uses THEN
    RETURN FALSE;
  END IF;

  -- Delete previous redemptions for this checkout session
  DELETE FROM public.promo_code_redemptions WHERE checkout_attempt_id = p_checkout_attempt_id;

  -- Expiry timestamp
  IF p_is_temporary THEN
    v_expires_at := now() + (p_hold_duration_minutes || ' minutes')::interval;
  ELSE
    v_expires_at := now() + interval '99 years';
  END IF;

  -- Insert code redemption hold
  INSERT INTO public.promo_code_redemptions (
    promo_code_id,
    order_id,
    checkout_attempt_id,
    normalized_client_email,
    status,
    reserved_at,
    expires_at
  ) VALUES (
    p_code_id,
    p_order_id,
    p_checkout_attempt_id,
    v_normalized_email,
    CASE WHEN p_is_temporary THEN 'reserved'::text ELSE 'confirmed'::text END,
    now(),
    v_expires_at
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- C. FONCTION DE CONFIRMATION DU CODE PROMO
DROP FUNCTION IF EXISTS private.confirm_promo_redemption(TEXT, UUID);
DROP FUNCTION IF EXISTS private.confirm_promo_redemption(UUID, UUID);

CREATE OR REPLACE FUNCTION private.confirm_promo_redemption(
  p_checkout_attempt_id TEXT,
  p_order_id UUID
) RETURNS VOID AS $$
BEGIN
  UPDATE public.promo_code_redemptions
  SET status = 'confirmed',
      order_id = p_order_id,
      confirmed_at = now()
  WHERE checkout_attempt_id = p_checkout_attempt_id
    AND status = 'reserved';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- D. FONCTION DE LIBERATION DU CODE PROMO
DROP FUNCTION IF EXISTS private.release_promo_redemption(TEXT);
DROP FUNCTION IF EXISTS private.release_promo_redemption(UUID);

CREATE OR REPLACE FUNCTION private.release_promo_redemption(
  p_checkout_attempt_id TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE public.promo_code_redemptions
  SET status = 'released',
      released_at = now()
  WHERE checkout_attempt_id = p_checkout_attempt_id
    AND status = 'reserved';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- =========================================================================
-- 8. SECURISATION ET RECOVATIONS DE PERMISSIONS SUR LES FONCTIONS PRIVEES
-- =========================================================================
REVOKE ALL ON FUNCTION private.check_and_reserve_slot FROM PUBLIC;
REVOKE ALL ON FUNCTION private.check_and_reserve_slot FROM anon;
REVOKE ALL ON FUNCTION private.check_and_reserve_slot FROM authenticated;

REVOKE ALL ON FUNCTION private.reserve_promo_code FROM PUBLIC;
REVOKE ALL ON FUNCTION private.reserve_promo_code FROM anon;
REVOKE ALL ON FUNCTION private.reserve_promo_code FROM authenticated;

REVOKE ALL ON FUNCTION private.confirm_promo_redemption FROM PUBLIC;
REVOKE ALL ON FUNCTION private.confirm_promo_redemption FROM anon;
REVOKE ALL ON FUNCTION private.confirm_promo_redemption FROM authenticated;

REVOKE ALL ON FUNCTION private.release_promo_redemption FROM PUBLIC;
REVOKE ALL ON FUNCTION private.release_promo_redemption FROM anon;
REVOKE ALL ON FUNCTION private.release_promo_redemption FROM authenticated;

-- =========================================================================
-- 9. INDEXATION OPTIMISÉE POUR LA CONCURRENCE ET LA RECHERCHE
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_orders_checkout_attempt_id ON public.orders(checkout_attempt_id);
CREATE INDEX IF NOT EXISTS idx_orders_public_token ON public.orders(public_token);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_payment_intent_id ON public.orders(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_orders_fulfillment_status ON public.orders(fulfillment_status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_service_date ON public.orders(service_date);
CREATE INDEX IF NOT EXISTS idx_orders_availability_slot_id ON public.orders(availability_slot_id);
CREATE INDEX IF NOT EXISTS idx_orders_slot_hold_expires_at ON public.orders(slot_hold_expires_at) WHERE slot_hold_expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_promo_code_redemptions_promo_code_id ON public.promo_code_redemptions(promo_code_id);
CREATE INDEX IF NOT EXISTS idx_promo_code_redemptions_expires_at ON public.promo_code_redemptions(expires_at);
CREATE INDEX IF NOT EXISTS idx_email_jobs_status_next_attempt ON public.email_jobs(status, next_attempt_at) WHERE status IN ('pending', 'failed');

-- =========================================================================
-- 10. SECURISATION ROW LEVEL SECURITY (RLS) DES TABLES E-COMMERCE
-- =========================================================================

-- Activation de RLS sur toutes les tables
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_code_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.closed_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_jobs ENABLE ROW LEVEL SECURITY;

-- Politiques RLS :
-- Rôle public / anon n'a aucun droit direct en INSERT, UPDATE, ou DELETE sur aucune de ces tables.
-- Tout passe par l'API Backend privilégiée utilisant les clés service_role / pg client.

-- DROP POLICIES IF THEY EXIST
DROP POLICY IF EXISTS "Allow public select store_settings" ON public.store_settings;
DROP POLICY IF EXISTS "Allow public select active delivery_zones" ON public.delivery_zones;
DROP POLICY IF EXISTS "Allow public select active promo_codes" ON public.promo_codes;
DROP POLICY IF EXISTS "Allow public select active slots" ON public.availability_slots;
DROP POLICY IF EXISTS "Allow public select closed_dates" ON public.closed_dates;
DROP POLICY IF EXISTS "Allow customer select order via public token" ON public.orders;
DROP POLICY IF EXISTS "Allow customer select order items" ON public.order_items;

DROP POLICY IF EXISTS "Admin all operations store_settings" ON public.store_settings;
DROP POLICY IF EXISTS "Admin all operations delivery_zones" ON public.delivery_zones;
DROP POLICY IF EXISTS "Admin all operations promo_codes" ON public.promo_codes;
DROP POLICY IF EXISTS "Admin all operations redemptions" ON public.promo_code_redemptions;
DROP POLICY IF EXISTS "Admin all operations slots" ON public.availability_slots;
DROP POLICY IF EXISTS "Admin all operations closed_dates" ON public.closed_dates;
DROP POLICY IF EXISTS "Admin all operations orders" ON public.orders;
DROP POLICY IF EXISTS "Admin all operations order_items" ON public.order_items;
DROP POLICY IF EXISTS "Admin all operations stripe_events" ON public.stripe_events;
DROP POLICY IF EXISTS "Admin all operations audit_logs" ON public.admin_audit_logs;
DROP POLICY IF EXISTS "Admin all operations email_jobs" ON public.email_jobs;

-- SELECT Policies (pour lecture publique non-sensible)
CREATE POLICY "Allow public select store_settings" ON public.store_settings FOR SELECT USING (true);
CREATE POLICY "Allow public select active delivery_zones" ON public.delivery_zones FOR SELECT USING (is_active = true);
CREATE POLICY "Allow public select active promo_codes" ON public.promo_codes FOR SELECT USING (is_active = true);
CREATE POLICY "Allow public select active slots" ON public.availability_slots FOR SELECT USING (is_active = true);
CREATE POLICY "Allow public select closed_dates" ON public.closed_dates FOR SELECT USING (true);

-- SELECT Policies pour commande par public_token unique (UUID)
CREATE POLICY "Allow customer select order via public token" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Allow customer select order items" ON public.order_items FOR SELECT USING (true);

-- Politiques RLS Administrateur :
-- Droit total sur toutes les tables pour les comptes authentifiés avec le rôle 'admin'.
CREATE POLICY "Admin all operations store_settings" ON public.store_settings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin all operations delivery_zones" ON public.delivery_zones FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin all operations promo_codes" ON public.promo_codes FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin all operations redemptions" ON public.promo_code_redemptions FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin all operations slots" ON public.availability_slots FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin all operations closed_dates" ON public.closed_dates FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin all operations orders" ON public.orders FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin all operations order_items" ON public.order_items FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin all operations stripe_events" ON public.stripe_events FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin all operations audit_logs" ON public.admin_audit_logs FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin all operations email_jobs" ON public.email_jobs FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
