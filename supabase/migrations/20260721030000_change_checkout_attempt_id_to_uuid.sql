-- =========================================================================
-- 1. CONVERTIR LES COLONNES checkout_attempt_id EN TYPE UUID
-- =========================================================================

-- Clear any dummy test records that might have invalid UUID strings before altering type
DELETE FROM public.orders WHERE order_number = 'BRWN-TEST-001';
DELETE FROM public.promo_code_redemptions WHERE status IN ('reserved', 'released', 'expired');

-- Alter columns in orders and promo_code_redemptions
ALTER TABLE public.orders 
  ALTER COLUMN checkout_attempt_id TYPE UUID USING checkout_attempt_id::UUID;

ALTER TABLE public.promo_code_redemptions 
  ALTER COLUMN checkout_attempt_id TYPE UUID USING checkout_attempt_id::UUID;

-- =========================================================================
-- 2. METTRE A JOUR LA FONCTION private.check_and_reserve_slot EN UUID
-- =========================================================================

DROP FUNCTION IF EXISTS private.check_and_reserve_slot(UUID, DATE, TEXT, TEXT, UUID, INTEGER, BOOLEAN);
DROP FUNCTION IF EXISTS private.check_and_reserve_slot(UUID, DATE, TEXT, UUID, UUID, INTEGER, BOOLEAN);

CREATE OR REPLACE FUNCTION private.check_and_reserve_slot(
  p_availability_slot_id UUID,
  p_service_date DATE,
  p_fulfillment_type TEXT,
  p_checkout_attempt_id UUID,
  p_order_id UUID,
  p_hold_duration_minutes INT,
  p_is_temporary BOOLEAN
) RETURNS BOOLEAN AS $$
DECLARE
  v_max_orders INT;
  v_is_active BOOLEAN;
  v_day_of_week INT;
  v_active_orders_count INT;
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

REVOKE ALL ON FUNCTION private.check_and_reserve_slot FROM PUBLIC;
REVOKE ALL ON FUNCTION private.check_and_reserve_slot FROM anon;
REVOKE ALL ON FUNCTION private.check_and_reserve_slot FROM authenticated;

-- =========================================================================
-- 3. METTRE A JOUR LA FONCTION private.reserve_promo_code EN UUID & SIGNATURE EXACTE
-- =========================================================================

DROP FUNCTION IF EXISTS private.reserve_promo_code(UUID, UUID, TEXT, TEXT, BOOLEAN, INTEGER);
DROP FUNCTION IF EXISTS private.reserve_promo_code(UUID, UUID, TEXT, TEXT, INTEGER);
DROP FUNCTION IF EXISTS private.reserve_promo_code(UUID, UUID, UUID, TEXT, INTEGER);

CREATE OR REPLACE FUNCTION private.reserve_promo_code(
  p_code_id UUID,
  p_order_id UUID,
  p_checkout_attempt_id UUID,
  p_client_email TEXT,
  p_expires_in_minutes INT
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

  -- Check validity dates
  IF v_start_date IS NOT NULL AND v_start_date > now() THEN
    RAISE EXCEPTION 'Promo code is not yet active';
  END IF;

  IF v_end_date IS NOT NULL AND v_end_date < now() THEN
    RAISE EXCEPTION 'Promo code has expired';
  END IF;

  -- Check if this attempt has already reserved/confirmed this code
  IF EXISTS (
    SELECT 1 
    FROM public.promo_code_redemptions 
    WHERE promo_code_id = p_code_id 
      AND checkout_attempt_id = p_checkout_attempt_id
      AND status IN ('reserved', 'confirmed')
  ) THEN
    RETURN TRUE;
  END IF;

  -- Calculate current confirmed uses
  SELECT COUNT(*) INTO v_confirmed_count
  FROM public.promo_code_redemptions
  WHERE promo_code_id = p_code_id
    AND status = 'confirmed';

  -- Calculate active reserved holds
  SELECT COUNT(*) INTO v_reserved_count
  FROM public.promo_code_redemptions
  WHERE promo_code_id = p_code_id
    AND status = 'reserved'
    AND expires_at > now();

  -- Verify usage capacity
  IF v_max_uses IS NOT NULL AND (v_confirmed_count + v_reserved_count) >= v_max_uses THEN
    RETURN FALSE;
  END IF;

  -- Calculate expiration timestamp
  v_expires_at := now() + (p_expires_in_minutes || ' minutes')::interval;

  -- Record reservation
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
    'reserved',
    now(),
    v_expires_at
  )
  ON CONFLICT (checkout_attempt_id) 
  DO UPDATE SET
    order_id = EXCLUDED.order_id,
    promo_code_id = EXCLUDED.promo_code_id,
    normalized_client_email = EXCLUDED.normalized_client_email,
    status = 'reserved',
    reserved_at = now(),
    expires_at = v_expires_at;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION private.reserve_promo_code FROM PUBLIC;
REVOKE ALL ON FUNCTION private.reserve_promo_code FROM anon;
REVOKE ALL ON FUNCTION private.reserve_promo_code FROM authenticated;

-- =========================================================================
-- 4. METTRE A JOUR confirm_promo_redemption ET release_promo_redemption EN UUID
-- =========================================================================

DROP FUNCTION IF EXISTS private.confirm_promo_redemption(TEXT, UUID);
DROP FUNCTION IF EXISTS private.confirm_promo_redemption(UUID, UUID);

CREATE OR REPLACE FUNCTION private.confirm_promo_redemption(
  p_checkout_attempt_id UUID,
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

REVOKE ALL ON FUNCTION private.confirm_promo_redemption FROM PUBLIC;
REVOKE ALL ON FUNCTION private.confirm_promo_redemption FROM anon;
REVOKE ALL ON FUNCTION private.confirm_promo_redemption FROM authenticated;


DROP FUNCTION IF EXISTS private.release_promo_redemption(TEXT);
DROP FUNCTION IF EXISTS private.release_promo_redemption(UUID);

CREATE OR REPLACE FUNCTION private.release_promo_redemption(
  p_checkout_attempt_id UUID
) RETURNS VOID AS $$
BEGIN
  UPDATE public.promo_code_redemptions
  SET status = 'released',
      released_at = now()
  WHERE checkout_attempt_id = p_checkout_attempt_id
    AND status = 'reserved';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION private.release_promo_redemption FROM PUBLIC;
REVOKE ALL ON FUNCTION private.release_promo_redemption FROM anon;
REVOKE ALL ON FUNCTION private.release_promo_redemption FROM authenticated;
