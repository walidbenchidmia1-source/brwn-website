-- =========================================================================
-- MIGRATION : Ajout des colonnes show_title et show_subtitle sur hero_slides
-- Permet de choisir d'afficher ou de masquer le titre H1 et/ou le sous-titre par slide
-- =========================================================================

ALTER TABLE public.hero_slides
  ADD COLUMN IF NOT EXISTS show_title BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_subtitle BOOLEAN DEFAULT true;

-- S'assurer que les slides existantes ont show_title et show_subtitle = true par défaut
UPDATE public.hero_slides
SET
  show_title = COALESCE(show_title, true),
  show_subtitle = COALESCE(show_subtitle, true);
