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
    const resAll = await supabaseAdmin
      .from("hero_slides")
      .select("id, media_type, image_url, mobile_image_url, alt_text, title_text, subtitle_text, button_text, aria_label, position, crop_data")
      .eq("is_active", true)
      .order("position", { ascending: true });

    if (resAll.error && resAll.error.message.includes("column")) {
      const resFallback = await supabaseAdmin
        .from("hero_slides")
        .select("id, media_type, image_url, mobile_image_url, alt_text, title_text, aria_label, position, crop_data")
        .eq("is_active", true)
        .order("position", { ascending: true });
      slides = resFallback.data;
    } else {
      slides = resAll.data;
    }

    const { data: settings } = await supabaseAdmin
      .from("hero_settings")
      .select("autoplay_enabled, autoplay_interval_ms, transition_duration_ms")
      .eq("id", "global")
      .maybeSingle();

    return {
      slides: slides && slides.length > 0 ? slides : undefined,
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
