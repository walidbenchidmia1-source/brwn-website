-- =========================================================================
-- CREATION DE LA FONCTION POUR OBTENIR LE PROCHAIN NUMERO DE SEQUENCE
-- =========================================================================
CREATE OR REPLACE FUNCTION public.orders_seq_next()
RETURNS bigint AS $$
BEGIN
  RETURN nextval('public.orders_seq');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
