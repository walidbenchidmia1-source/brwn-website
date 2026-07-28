import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import Stripe from "stripe";

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

    // 2. Validate refund body
    const body = await req.json().catch(() => ({}));
    const amountCents = body.amountCents ? parseInt(body.amountCents) : null;

    if (amountCents !== null && (isNaN(amountCents) || amountCents <= 0)) {
      return NextResponse.json({ error: "Montant de remboursement invalide." }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // 3. Fetch order details
    const { data: order, error: orderErr } = await adminClient
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();

    if (orderErr || !order) {
      return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
    }

    const maxRefundable = order.total_cents - order.refunded_amount_cents;
    if (maxRefundable <= 0) {
      return NextResponse.json({ error: "Cette commande est déjà entièrement remboursée." }, { status: 400 });
    }

    const refundAmount = amountCents !== null ? amountCents : maxRefundable;

    if (refundAmount > maxRefundable) {
      return NextResponse.json({
        error: `Le montant demandé (${(refundAmount / 100).toFixed(2)} $) dépasse le solde remboursable restant (${(maxRefundable / 100).toFixed(2)} $).`,
      }, { status: 400 });
    }

    const newRefundedTotal = order.refunded_amount_cents + refundAmount;
    const newPaymentStatus = newRefundedTotal >= order.total_cents ? "refunded" : "partially_refunded";
    const now = new Date().toISOString();

    // 4. If Stripe payment
    if (order.payment_method === "stripe") {
      if (!order.stripe_payment_intent_id) {
        return NextResponse.json({ error: "L'identifiant de paiement Stripe est manquant sur cette commande." }, { status: 400 });
      }

      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeKey) {
        return NextResponse.json({ error: "Clé secrète Stripe non configurée." }, { status: 500 });
      }

      const stripe = new Stripe(stripeKey, { apiVersion: "2022-11-15" as any });

      try {
        // Stripe Refund API call with idempotency key
        const refund = await stripe.refunds.create(
          {
            payment_intent: order.stripe_payment_intent_id,
            amount: refundAmount,
            metadata: {
              order_id: order.id,
            },
          },
          {
            idempotencyKey: `brwn-refund-${order.id}-${refundAmount}-${order.refunded_amount_cents}`,
          }
        );

        // Update database status immediately
        await adminClient
          .from("orders")
          .update({
            payment_status: newPaymentStatus,
            refunded_amount_cents: newRefundedTotal,
            refunded_at: now,
            stripe_refund_id: refund.id,
          })
          .eq("id", orderId);

        // Audit Log
        await adminClient.from("admin_audit_logs").insert({
          order_id: orderId,
          action_type: "refund_processed",
          previous_status: order.payment_status,
          new_status: newPaymentStatus,
          amount_cents: refundAmount,
          modified_by: user.id,
          note: `Remboursement en ligne Stripe de ${(refundAmount / 100).toFixed(2)} $ effectué par ${profile.full_name || "Admin"}. ID Refund: ${refund.id}.`,
        });

      } catch (stripeErr: any) {
        console.error("Stripe refund failed:", stripeErr);
        return NextResponse.json({ error: `Échec Stripe : ${stripeErr.message || stripeErr}` }, { status: 500 });
      }
    } else {
      // 5. Offline COD/COP Refund
      await adminClient
        .from("orders")
        .update({
          payment_status: newPaymentStatus,
          refunded_amount_cents: newRefundedTotal,
          refunded_at: now,
        })
        .eq("id", orderId);

      // Audit Log
      await adminClient.from("admin_audit_logs").insert({
        order_id: orderId,
        action_type: "refund_processed",
        previous_status: order.payment_status,
        new_status: newPaymentStatus,
        amount_cents: refundAmount,
        modified_by: user.id,
        note: `Enregistrement manuel du remboursement hors ligne de ${(refundAmount / 100).toFixed(2)} $ par ${profile.full_name || "Admin"}.`,
      });
    }

    return NextResponse.json({
      success: true,
      refundedAmountCents: refundAmount,
      totalRefundedCents: newRefundedTotal,
      newPaymentStatus,
    });

  } catch (err: any) {
    console.error("Refund route failed:", err);
    return NextResponse.json({ error: "Erreur interne serveur." }, { status: 500 });
  }
}
