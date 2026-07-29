import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";

// Desactiver tout cache Next.js pour que les modifications admin soient instantes sur la page client
export const dynamic = "force-dynamic";
export const revalidate = 0;

const DEFAULT_SLIDE = {
  id: "default-1",
  media_type: "image",
  image_url: "/images/hero_background.png",
  mobile_image_url: null,
  alt_text: "BRWN Tiramisu Gastronomique - Image de couverture",
  title_text: "Le Tiramisu Réinventé",
  subtitle_text: "Le premier tiramisu gastronomique au café de spécialité fait son entrée officielle au menu.",
  button_text: "Commander l'Original",
  aria_label: "Carrousel de couverture BRWN",
  position: 1,
  crop_data: { zoom: 1, x: 0, y: 0 },
};

const DEFAULT_SETTINGS = {
  autoplay_enabled: true,
  autoplay_interval_ms: 6000,
  transition_duration_ms: 700,
};

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET() {
  try {
    const supabaseAdmin = createAdminClient();

    // 1. Récupération des slides actives en direct
    const { data: slides, error: slidesError } = await supabaseAdmin
      .from("hero_slides")
      .select("id, media_type, image_url, mobile_image_url, alt_text, title_text, subtitle_text, button_text, aria_label, position, crop_data")
      .eq("is_active", true)
      .order("position", { ascending: true });

    // 2. Récupération des paramètres globaux en direct
    const { data: settingsData } = await supabaseAdmin
      .from("hero_settings")
      .select("autoplay_enabled, autoplay_interval_ms, transition_duration_ms")
      .eq("id", "global")
      .maybeSingle();

    const heroSettings = settingsData || DEFAULT_SETTINGS;

    if (slidesError || !slides || slides.length === 0) {
      return NextResponse.json(
        { slides: [DEFAULT_SLIDE], settings: heroSettings },
        { headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json(
      { slides, settings: heroSettings },
      { headers: NO_CACHE_HEADERS }
    );
  } catch {
    return NextResponse.json(
      { slides: [DEFAULT_SLIDE], settings: DEFAULT_SETTINGS },
      { headers: NO_CACHE_HEADERS }
    );
  }
}
