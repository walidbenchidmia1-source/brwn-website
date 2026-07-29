import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";

export const revalidate = 60; // Cache 60s pour performances optimales

const DEFAULT_SLIDE = {
  id: "default-1",
  media_type: "image",
  image_url: "/images/hero_background.png",
  mobile_image_url: null,
  alt_text: "BRWN Tiramisu Gastronomique - Image de couverture",
  title_text: "Le Tiramisu Réinventé par BRWN",
  aria_label: "Carrousel de couverture BRWN",
  position: 1,
  crop_data: { zoom: 1, x: 0, y: 0 },
};

const DEFAULT_SETTINGS = {
  autoplay_enabled: true,
  autoplay_interval_ms: 6000,
  transition_duration_ms: 700,
};

export async function GET() {
  try {
    const supabaseAdmin = createAdminClient();

    // 1. Récupération des slides actives (fallback gracieux si la table n'existe pas encore)
    const { data: slides, error: slidesError } = await supabaseAdmin
      .from("hero_slides")
      .select("id, media_type, image_url, mobile_image_url, alt_text, title_text, aria_label, position, crop_data")
      .eq("is_active", true)
      .order("position", { ascending: true });

    // 2. Récupération des paramètres globaux
    const { data: settingsData } = await supabaseAdmin
      .from("hero_settings")
      .select("autoplay_enabled, autoplay_interval_ms, transition_duration_ms")
      .eq("id", "global")
      .maybeSingle();

    const heroSettings = settingsData || DEFAULT_SETTINGS;

    if (slidesError || !slides || slides.length === 0) {
      return NextResponse.json({
        slides: [DEFAULT_SLIDE],
        settings: heroSettings,
      });
    }

    return NextResponse.json({ slides, settings: heroSettings });
  } catch {
    return NextResponse.json({
      slides: [DEFAULT_SLIDE],
      settings: DEFAULT_SETTINGS,
    });
  }
}
