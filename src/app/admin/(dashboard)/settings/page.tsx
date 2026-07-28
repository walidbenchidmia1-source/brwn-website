import React from "react";
import SettingsDashboard from "./SettingsDashboard";
import { createAdminClient } from "@/utils/supabase/admin";

export const revalidate = 0; // Disable cache

export default async function AdminSettingsPage() {
  const supabase = createAdminClient();

  // Fetch global settings
  const { data: settings } = await supabase
    .from("store_settings")
    .select("*")
    .eq("id", "global")
    .maybeSingle();

  // Fetch delivery zones
  const { data: zones } = await supabase
    .from("delivery_zones")
    .select("*")
    .order("created_at", { ascending: true });

  // Fetch availability slots
  const { data: slots } = await supabase
    .from("availability_slots")
    .select("*")
    .order("day_of_week", { ascending: true })
    .order("time_slot", { ascending: true });

  // Fetch closed dates
  const { data: closedDates } = await supabase
    .from("closed_dates")
    .select("*")
    .order("closed_date", { ascending: true });

  // Fetch promo codes
  const { data: promos } = await supabase
    .from("promo_codes")
    .select("*")
    .order("created_at", { ascending: false });

  const hasStripeKeys = !!(process.env.STRIPE_SECRET_KEY && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
  const globalSettings = {
    ...(settings || {
      pickup_address: "123 Rue de Tiramisu, Montréal, QC",
      pickup_instructions: "Veuillez vous présenter au comptoir avec votre numéro de commande.",
      preparation_delay_hours: 24,
      min_order_cents: 1500,
      free_delivery_min_cents: 5000,
      tax_rate_gst: 0.05,
      tax_rate_qst: 0.09975,
      stripe_enabled: true,
      cod_enabled: true,
      cop_enabled: true,
    }),
    stripe_keys_configured: hasStripeKeys,
  };

  return (
    <div className="bg-[#FAF7F2] min-h-screen">
      <div className="mb-6">
        <span className="text-[10px] font-black uppercase tracking-widest text-[#C4A484]">
          Gestion E-Commerce
        </span>
        <h1 className="text-2xl font-black uppercase text-[#3D2216]">
          Réglages de la Boutique
        </h1>
      </div>
      <SettingsDashboard
        settings={globalSettings}
        zones={zones || []}
        slots={slots || []}
        closedDates={closedDates || []}
        promos={promos || []}
      />
    </div>
  );
}
