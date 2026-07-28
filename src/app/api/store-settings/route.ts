import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("store_settings")
      .select("*")
      .eq("id", "global")
      .maybeSingle();

    if (error) {
      console.error("Failed to fetch store settings from db:", error);
    }

    const hasStripeKeys = !!(process.env.STRIPE_SECRET_KEY && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
    const storeSettings = {
      ...(data || {
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
      stripe_enabled: hasStripeKeys && (data ? data.stripe_enabled : true),
      stripe_keys_configured: hasStripeKeys,
    };

    return NextResponse.json(storeSettings);
  } catch (err: any) {
    console.error("Failed to load store settings API:", err);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
