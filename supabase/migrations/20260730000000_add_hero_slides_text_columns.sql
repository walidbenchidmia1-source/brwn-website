-- =========================================================================
-- MIGRATION : Ajout des colonnes subtitle_text et button_text sur hero_slides
-- Ces colonnes ont été créées manuellement en production mais manquaient
-- dans le fichier de migration initial.
-- =========================================================================

-- Ajout idempotent de subtitle_text (texte descriptif sous le titre H1)
ALTER TABLE public.hero_slides
  ADD COLUMN IF NOT EXISTS subtitle_text TEXT DEFAULT 'Le premier tiramisu gastronomique au café de spécialité fait son entrée officielle au menu.';

-- Ajout idempotent de button_text (texte du bouton CTA principal)
ALTER TABLE public.hero_slides
  ADD COLUMN IF NOT EXISTS button_text TEXT DEFAULT 'Commander l''Original';

-- Mise à jour des données existantes si les colonnes étaient NULL
UPDATE public.hero_slides
SET
  subtitle_text = COALESCE(subtitle_text, 'Le premier tiramisu gastronomique au café de spécialité fait son entrée officielle au menu.'),
  button_text   = COALESCE(button_text, 'Commander l''Original')
WHERE subtitle_text IS NULL OR button_text IS NULL;
