import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const orderId = resolvedParams.id;

    // 1. Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    }

    // Fetch user profile to verify role
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Interdit. Rôle admin requis." }, { status: 403 });
    }

    // 2. Validate body
    const body = await req.json();
    const { fulfillmentStatus, paymentStatus, note } = body;

    const adminClient = createAdminClient();

    // Fetch existing order details
    const { data: order, error: orderErr } = await adminClient
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();

    if (orderErr || !order) {
      return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
    }

    const updates: any = {};
    const auditLogs = [];

    // Check transitions
    if (fulfillmentStatus && fulfillmentStatus !== order.fulfillment_status) {
      updates.fulfillment_status = fulfillmentStatus;
      auditLogs.push({
        order_id: orderId,
        action_type: "fulfillment_status_update",
        previous_status: order.fulfillment_status,
        new_status: fulfillmentStatus,
        modified_by: user.id,
        note: `Statut de préparation mis à jour par ${profile.full_name || "Admin"}. ${note || ""}`,
      });

      // If cancelled, release slot hold and promo redemption
      if (fulfillmentStatus === "cancelled") {
        const now = new Date().toISOString();
        updates.slot_released_at = now;
        updates.slot_hold_expires_at = now;

        await adminClient
          .from("promo_code_redemptions")
          .update({ status: "released", released_at: now })
          .eq("order_id", orderId);
      }
    }

    if (paymentStatus && paymentStatus !== order.payment_status) {
      updates.payment_status = paymentStatus;
      if (paymentStatus === "paid") {
        updates.paid_at = new Date().toISOString();
      }
      auditLogs.push({
        order_id: orderId,
        action_type: "payment_status_update",
        previous_status: order.payment_status,
        new_status: paymentStatus,
        modified_by: user.id,
        note: `Statut de paiement mis à jour par ${profile.full_name || "Admin"}. ${note || ""}`,
      });
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateErr } = await adminClient
        .from("orders")
        .update(updates)
        .eq("id", orderId);

      if (updateErr) {
        console.error("Order status update failed:", updateErr);
        return NextResponse.json({ error: "Échec de la mise à jour." }, { status: 500 });
      }

      // Insert audit logs
      if (auditLogs.length > 0) {
        await adminClient.from("admin_audit_logs").insert(auditLogs);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Status update route failed:", err);
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}
