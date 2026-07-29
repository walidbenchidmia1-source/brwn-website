import React from "react";
import { createAdminClient } from "@/utils/supabase/admin";
import HomepageSettingsClient from "./HomepageSettingsClient";

export const revalidate = 0;

export default async function AdminHomepageSettingsPage() {
  const supabaseAdmin = createAdminClient();

  const { data: slides } = await supabaseAdmin
    .from("hero_slides")
    .select("*")
    .order("position", { ascending: true });

  const { data: settings } = await supabaseAdmin
    .from("hero_settings")
    .select("*")
    .eq("id", "global")
    .maybeSingle();

  const initialSettings = settings || {
    id: "global",
    autoplay_enabled: true,
    autoplay_interval_ms: 6000,
    transition_duration_ms: 700,
  };

  return (
    <div className="bg-[#FAF7F2] min-h-screen">
      <HomepageSettingsClient initialSlides={slides || []} initialSettings={initialSettings} />
    </div>
  );
}
