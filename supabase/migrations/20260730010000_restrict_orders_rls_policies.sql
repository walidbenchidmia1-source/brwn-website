-- =========================================================================
-- MIGRATION : Sécurisation des politiques RLS sur orders et order_items
-- =========================================================================

-- Supprimer les anciennes politiques SELECT publiques trop permissives (USING (true))
DROP POLICY IF EXISTS "Allow customer select order via public token" ON public.orders;
DROP POLICY IF EXISTS "Allow customer select order items" ON public.order_items;

-- Note d'architecture :
-- L'accès aux commandes pour les clients (soumission de commande, confirmation
-- par token unique) ainsi que pour les administrateurs s'effectue intégralement
-- via les Server Components et routes API privilégiées du serveur Next.js.
-- La suppression de ces politiques publiques directes empêche tout dump
-- de données PII clients par des requêtes directes avec la clé anon.
