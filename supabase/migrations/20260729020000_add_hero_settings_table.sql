-- =========================================================================
-- MIGRATION : Creation de la table public.hero_settings pour les options globales
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.hero_settings (
  id TEXT PRIMARY KEY DEFAULT 'global',
  autoplay_enabled BOOLEAN NOT NULL DEFAULT true,
  autoplay_interval_ms INTEGER NOT NULL DEFAULT 6000 CONSTRAINT check_interval CHECK (autoplay_interval_ms >= 1000),
  transition_duration_ms INTEGER NOT NULL DEFAULT 700 CONSTRAINT check_transition CHECK (transition_duration_ms >= 100),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Activer RLS sur public.hero_settings
ALTER TABLE public.hero_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read hero settings" ON public.hero_settings;
DROP POLICY IF EXISTS "Admin all operations hero settings" ON public.hero_settings;

-- Lecture publique
CREATE POLICY "Public read hero settings" ON public.hero_settings
  FOR SELECT USING (true);

-- Administration RLS
CREATE POLICY "Admin all operations hero settings" ON public.hero_settings
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Insertion initiale des parametres par defaut
INSERT INTO public.hero_settings (id, autoplay_enabled, autoplay_interval_ms, transition_duration_ms)
VALUES ('global', true, 6000, 700)
ON CONFLICT (id) DO NOTHING;
