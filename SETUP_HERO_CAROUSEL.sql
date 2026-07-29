-- =========================================================================
-- SCRIPT SQL DE CONFIGURATION DU CARROUSEL HERO ET DES TEXTES (BRWN)
-- À exécuter dans le Supabase SQL Editor de votre projet
-- =========================================================================

-- 1. TABLE PUBLIC.HERO_SLIDES
CREATE TABLE IF NOT EXISTS public.hero_slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_type TEXT NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  image_path TEXT NOT NULL,
  image_url TEXT NOT NULL,
  mobile_image_path TEXT,
  mobile_image_url TEXT,
  previous_image_path TEXT,
  previous_image_url TEXT,
  previous_mobile_image_path TEXT,
  previous_mobile_image_url TEXT,
  alt_text TEXT NOT NULL DEFAULT 'Image de couverture BRWN',
  title_text TEXT DEFAULT 'Le Tiramisu Réinventé',
  subtitle_text TEXT DEFAULT 'Le premier tiramisu gastronomique au café de spécialité fait son entrée officielle au menu.',
  button_text TEXT DEFAULT 'Commander l''Original',
  aria_label TEXT DEFAULT 'Image du carrousel de couverture BRWN',
  position INTEGER NOT NULL CHECK (position BETWEEN 1 AND 3),
  is_active BOOLEAN NOT NULL DEFAULT true,
  file_size_bytes INTEGER,
  file_format TEXT,
  crop_data JSONB DEFAULT '{"zoom": 1, "x": 0, "y": 0}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT unique_hero_slide_position UNIQUE (position)
);

-- Ajouter les colonnes si la table existait déjà
ALTER TABLE public.hero_slides ADD COLUMN IF NOT EXISTS subtitle_text TEXT DEFAULT 'Le premier tiramisu gastronomique au café de spécialité fait son entrée officielle au menu.';
ALTER TABLE public.hero_slides ADD COLUMN IF NOT EXISTS button_text TEXT DEFAULT 'Commander l''Original';

-- RLS hero_slides
ALTER TABLE public.hero_slides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active hero slides" ON public.hero_slides;
DROP POLICY IF EXISTS "Admin all operations hero slides" ON public.hero_slides;

CREATE POLICY "Public read active hero slides" ON public.hero_slides
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admin all operations hero slides" ON public.hero_slides
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 2. TABLE PUBLIC.HERO_SETTINGS
CREATE TABLE IF NOT EXISTS public.hero_settings (
  id TEXT PRIMARY KEY DEFAULT 'global',
  autoplay_enabled BOOLEAN NOT NULL DEFAULT true,
  autoplay_interval_ms INTEGER NOT NULL DEFAULT 6000 CONSTRAINT check_interval CHECK (autoplay_interval_ms >= 1000),
  transition_duration_ms INTEGER NOT NULL DEFAULT 700 CONSTRAINT check_transition CHECK (transition_duration_ms >= 100),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.hero_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read hero settings" ON public.hero_settings;
DROP POLICY IF EXISTS "Admin all operations hero settings" ON public.hero_settings;

CREATE POLICY "Public read hero settings" ON public.hero_settings
  FOR SELECT USING (true);

CREATE POLICY "Admin all operations hero settings" ON public.hero_settings
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 3. BUCKET STORAGE HERO-IMAGES
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hero-images',
  'hero-images',
  true,
  8388608,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif', 'video/mp4', 'video/webm']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 8388608,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif', 'video/mp4', 'video/webm'];

DROP POLICY IF EXISTS "Public select hero images storage" ON storage.objects;
DROP POLICY IF EXISTS "Admin all storage operations hero images" ON storage.objects;

CREATE POLICY "Public select hero images storage" ON storage.objects
  FOR SELECT USING (bucket_id = 'hero-images');

CREATE POLICY "Admin all storage operations hero images" ON storage.objects
  FOR ALL TO authenticated USING (bucket_id = 'hero-images' AND public.is_admin())
  WITH CHECK (bucket_id = 'hero-images' AND public.is_admin());

-- 4. DONNEES INITIALES
INSERT INTO public.hero_slides (
  position,
  media_type,
  image_path,
  image_url,
  alt_text,
  title_text,
  subtitle_text,
  button_text,
  aria_label,
  is_active
)
SELECT
  1,
  'image',
  'hero_background_default.png',
  '/images/hero_background.png',
  'Image de couverture originale BRWN Tiramisu',
  'Le Tiramisu Réinventé',
  'Le premier tiramisu gastronomique au café de spécialité fait son entrée officielle au menu.',
  'Commander l''Original',
  'Slide 1 - Image de couverture originale',
  true
WHERE NOT EXISTS (SELECT 1 FROM public.hero_slides WHERE position = 1);

INSERT INTO public.hero_settings (id, autoplay_enabled, autoplay_interval_ms, transition_duration_ms)
VALUES ('global', true, 6000, 700)
ON CONFLICT (id) DO NOTHING;
