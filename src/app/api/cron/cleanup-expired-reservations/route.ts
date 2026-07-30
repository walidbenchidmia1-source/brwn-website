import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function GET(req: Request) {
  try {
    // 1. Verify Vercel Cron Secret
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const now = new Date().toISOString();

    console.log("Starting cron cleanup for expired reservations...");

    // 2. Identify expired temporary slot holds in orders (pending and expires_at < now)
    const { data: expiredOrders, error: fetchErr } = await supabase
      .from("orders")
      .select("id, order_number")
      .eq("payment_status", "pending")
      .not("slot_hold_expires_at", "is", null)
      .lt("slot_hold_expires_at", now);

    if (fetchErr) {
      console.error("Failed to query expired orders:", fetchErr);
      return NextResponse.json({ error: "Failed to query database" }, { status: 500 });
    }

    let ordersCleaned = 0;
    if (expiredOrders && expiredOrders.length > 0) {
      const expiredIds = expiredOrders.map((o) => o.id);
      
      // Update orders: cancel them, release slots
      const { error: updateErr } = await supabase
        .from("orders")
        .update({
          payment_status: "failed",
          fulfillment_status: "cancelled",
          slot_released_at: now,
        })
        .in("id", expiredIds);

      if (updateErr) {
        console.error("Failed to update expired orders:", updateErr);
      } else {
        ordersCleaned = expiredIds.length;
        // Insert audit log entries
        for (const o of expiredOrders) {
          await supabase.from("admin_audit_logs").insert({
            order_id: o.id,
            action_type: "cron_cleanup_expiration",
            previous_status: "pending",
            new_status: "cancelled",
            note: `Annulation automatique de la commande temporaire ${o.order_number} suite à l'expiration du créneau de 15 minutes.`,
          });
        }
      }
    }

    // 3. Expire temporary promo code redemptions
    const { error: promoErr } = await supabase
      .from("promo_code_redemptions")
      .update({
        status: "expired",
      })
      .eq("status", "reserved")
      .lt("expires_at", now);

    if (promoErr) {
      console.error("Failed to cleanup expired promo redemptions:", promoErr);
    }

    return NextResponse.json({
      success: true,
      ordersCleaned,
      timestamp: now,
    });
  } catch (err: any) {
    console.error("Failed in cron cleanup routine:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
