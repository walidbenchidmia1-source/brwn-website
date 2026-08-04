-- =========================================================================
-- MIGRATION : Ajout de la colonne show_title sur hero_slides
-- Permet de choisir d'afficher ou de masquer le titre H1 par slide
-- =========================================================================

ALTER TABLE public.hero_slides
  ADD COLUMN IF NOT EXISTS show_title BOOLEAN DEFAULT true;

-- S'assurer que les slides existantes ont show_title = true par défaut
UPDATE public.hero_slides
SET show_title = true
WHERE show_title IS NULL;
