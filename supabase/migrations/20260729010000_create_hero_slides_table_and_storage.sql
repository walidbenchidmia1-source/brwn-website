-- =========================================================================
-- MIGRATION : Creation de la table public.hero_slides et bucket hero-images
-- =========================================================================

-- 1. Creation de la table public.hero_slides
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
  title_text TEXT DEFAULT 'BRWN Tiramisu Gastronomique',
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

-- 2. Activer RLS sur public.hero_slides
ALTER TABLE public.hero_slides ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques si existantes
DROP POLICY IF EXISTS "Public read active hero slides" ON public.hero_slides;
DROP POLICY IF EXISTS "Admin all operations hero slides" ON public.hero_slides;

-- Politique lecture publique : uniquement les slides actives
CREATE POLICY "Public read active hero slides" ON public.hero_slides
  FOR SELECT USING (is_active = true);

-- Politique administrateur : accès total via public.is_admin()
CREATE POLICY "Admin all operations hero slides" ON public.hero_slides
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 3. Configuration du Bucket Storage hero-images dans Supabase Storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hero-images',
  'hero-images',
  true,
  8388608, -- 8 Mo maximum
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif', 'video/mp4', 'video/webm']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 8388608,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif', 'video/mp4', 'video/webm'];

-- Politiques RLS pour Storage (storage.objects)
DROP POLICY IF EXISTS "Public select hero images storage" ON storage.objects;
DROP POLICY IF EXISTS "Admin all storage operations hero images" ON storage.objects;

CREATE POLICY "Public select hero images storage" ON storage.objects
  FOR SELECT USING (bucket_id = 'hero-images');

CREATE POLICY "Admin all storage operations hero images" ON storage.objects
  FOR ALL TO authenticated USING (bucket_id = 'hero-images' AND public.is_admin())
  WITH CHECK (bucket_id = 'hero-images' AND public.is_admin());

-- 4. Insertion de l'image de couverture actuelle comme Slide 1 par défaut (si la table est vide)
INSERT INTO public.hero_slides (
  position,
  media_type,
  image_path,
  image_url,
  alt_text,
  title_text,
  aria_label,
  is_active
)
SELECT
  1,
  'image',
  'hero_background_default.png',
  '/images/hero_background.png',
  'Image de couverture originale BRWN Tiramisu',
  'Le Tiramisu Réinventé par BRWN',
  'Slide 1 - Image de couverture originale',
  true
WHERE NOT EXISTS (SELECT 1 FROM public.hero_slides WHERE position = 1);
