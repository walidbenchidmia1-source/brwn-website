import SmoothScroll from "@/components/SmoothScroll";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Deconstruction from "@/components/Deconstruction";
import Footer from "@/components/Footer";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getHeroData() {
  try {
    const supabaseAdmin = createAdminClient();

    let slides: any[] | null = null;
    const { data: fetchSlides, error: slidesErr } = await supabaseAdmin
      .from("hero_slides")
      .select("id, media_type, image_url, mobile_image_url, alt_text, title_text, subtitle_text, button_text, aria_label, position, crop_data, show_title, show_subtitle")
      .eq("is_active", true)
      .order("position", { ascending: true });

    slides = fetchSlides;

    if (slidesErr && slidesErr.message.includes("Could not find")) {
      const { data: fallbackSlides } = await supabaseAdmin
        .from("hero_slides")
        .select("id, media_type, image_url, mobile_image_url, alt_text, title_text, subtitle_text, button_text, aria_label, position, crop_data")
        .eq("is_active", true)
        .order("position", { ascending: true });
      slides = fallbackSlides;
    }

    const { data: settings } = await supabaseAdmin
      .from("hero_settings")
      .select("autoplay_enabled, autoplay_interval_ms, transition_duration_ms")
      .eq("id", "global")
      .maybeSingle();

    const normalizedSlides = (slides || []).map((s) => ({
      ...s,
      show_title: s.crop_data?.show_title ?? s.show_title ?? true,
      show_subtitle: s.crop_data?.show_subtitle ?? s.show_subtitle ?? true,
    }));

    return {
      slides: normalizedSlides.length > 0 ? normalizedSlides : undefined,
      settings: settings || undefined,
    };
  } catch {
    return { slides: undefined, settings: undefined };
  }
}

export default async function Home() {
  const { slides, settings } = await getHeroData();

  return (
    <SmoothScroll>
      <Navbar />
      <main className="flex flex-col w-full">
        <Hero initialSlides={slides} initialSettings={settings} />
        <Deconstruction />
      </main>
      <Footer />
    </SmoothScroll>
  );
}
