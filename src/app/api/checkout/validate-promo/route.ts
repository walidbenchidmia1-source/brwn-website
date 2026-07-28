import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const subtotalStr = searchParams.get("subtotal");

    if (!code) {
      return NextResponse.json({ success: false, error: "Code promo manquant." }, { status: 400 });
    }

    const subtotalCents = subtotalStr ? parseInt(subtotalStr) : 0;
    const normalized = code.trim().toUpperCase();

    const supabase = createAdminClient();

    const { data: promo, error } = await supabase
      .from("promo_codes")
      .select("*")
      .eq("code", normalized)
      .eq("is_active", true)
      .maybeSingle();

    if (error || !promo) {
      return NextResponse.json({ success: false, error: "Code promotionnel invalide ou expiré." });
    }

    // Check dates
    if (promo.start_date && new Date(promo.start_date) > new Date()) {
      return NextResponse.json({ success: false, error: "Ce code promo n'est pas encore actif." });
    }

    if (promo.end_date && new Date(promo.end_date) < new Date()) {
      return NextResponse.json({ success: false, error: "Ce code promo a expiré." });
    }

    // Check min order value
    if (subtotalCents < promo.min_order_cents) {
      return NextResponse.json({
        success: false,
        error: `Ce code nécessite un achat minimum de ${(promo.min_order_cents / 100).toFixed(2)} $.`,
      });
    }

    // Check usages count
    const { data: counts } = await supabase
      .from("promo_code_redemptions")
      .select("id")
      .eq("promo_code_id", promo.id)
      .eq("status", "confirmed");

    const confirmedCount = counts?.length || 0;

    const { data: activeHolds } = await supabase
      .from("promo_code_redemptions")
      .select("id")
      .eq("promo_code_id", promo.id)
      .eq("status", "reserved")
      .gt("expires_at", new Date().toISOString());

    const activeHoldsCount = activeHolds?.length || 0;

    if (promo.max_uses !== null && (confirmedCount + activeHoldsCount) >= promo.max_uses) {
      return NextResponse.json({ success: false, error: "Ce code promo a atteint sa limite d'utilisation." });
    }

    return NextResponse.json({
      success: true,
      promo: {
        id: promo.id,
        code: promo.code,
        discount_type: promo.discount_type,
        discount_value: promo.discount_value,
        max_discount_cents: promo.max_discount_cents,
      },
    });
  } catch (err: any) {
    console.error("Promo code validation error:", err);
    return NextResponse.json({ success: false, error: "Erreur interne" }, { status: 500 });
  }
}
