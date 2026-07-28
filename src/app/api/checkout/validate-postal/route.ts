import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    if (!code || code.trim().length < 3) {
      return NextResponse.json({ success: false, error: "Code postal manquant ou trop court." }, { status: 400 });
    }

    const normalized = code.trim().toUpperCase().replace(/\s+/g, "");
    if (normalized.length < 3) {
      return NextResponse.json({ success: false, error: "Code postal invalide." }, { status: 400 });
    }

    const prefix = normalized.substring(0, 3);
    const supabase = createAdminClient();

    const { data: zones, error } = await supabase
      .from("delivery_zones")
      .select("*")
      .eq("is_active", true);

    if (error) {
      console.error("Delivery zones validate fetch error:", error);
      return NextResponse.json({ success: false, error: "Erreur serveur." }, { status: 500 });
    }

    const matchingZone = (zones || []).find((z) => {
      let prefixes: string[] = [];
      if (Array.isArray(z.postal_code_prefixes)) {
        prefixes = z.postal_code_prefixes;
      } else if (typeof z.postal_code_prefixes === "string") {
        try {
          prefixes = JSON.parse(z.postal_code_prefixes);
        } catch {
          prefixes = z.postal_code_prefixes.split(",").map((s: string) => s.trim());
        }
      }
      return Array.isArray(prefixes) && prefixes.some((p: string) => typeof p === "string" && p.trim().toUpperCase() === prefix);
    });

    if (!matchingZone) {
      return NextResponse.json({
        success: false,
        error: "Désolé, nous ne livrons pas dans votre secteur. Veuillez choisir le ramassage sur place.",
      });
    }

    return NextResponse.json({
      success: true,
      zoneName: matchingZone.name,
      deliveryFeeCents: matchingZone.delivery_fee_cents,
      minOrderCents: matchingZone.min_order_cents,
    });
  } catch (err: any) {
    console.error("Postal code validation error:", err);
    return NextResponse.json({ success: false, error: "Erreur interne." }, { status: 500 });
  }
}
