import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createAdminClient } from "@/utils/supabase/admin";
import Stripe from "stripe";

export async function POST(req: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeKey) {
    console.error("Stripe Secret Key is missing in webhook server.");
    return NextResponse.json({ error: "Configuration Error" }, { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2022-11-15" as any });
  const headersList = await headers();
  const sig = headersList.get("stripe-signature");

  if (!sig || !endpointSecret) {
    return NextResponse.json({ error: "Missing signature or secret" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
  } catch (err: any) {
    console.error(`Webhook Signature verification failed: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Deduplication check: see if event has already been processed
  const { data: existingEvent } = await supabase
    .from("stripe_events")
    .select("stripe_event_id")
    .eq("stripe_event_id", event.id)
    .maybeSingle();

  if (existingEvent) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  // Insert event into log immediately (using database uniqueness to block parallel calls)
  const { error: insertEventErr } = await supabase
    .from("stripe_events")
    .insert({
      stripe_event_id: event.id,
      event_type: event.type,
    });

  if (insertEventErr) {
    console.error("Stripe event deduplication insert failed:", insertEventErr);
    return NextResponse.json({ received: true, duplicate: true }); // treat as duplicate to be safe
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const orderId = pi.metadata.order_id;

        if (!orderId) {
          console.error("Stripe Webhook: payment_intent.succeeded missing metadata.order_id");
          break;
        }

        // Fetch Order
        const { data: order } = await supabase
          .from("orders")
          .select("*")
          .eq("id", orderId)
          .maybeSingle();

        if (!order) {
          console.error(`Stripe Webhook: Order ${orderId} not found in DB.`);
          // Log anomaly
          break;
        }

        // Verify currency and amount matching
        const currencyOk = pi.currency.toLowerCase() === "cad";
        const amountOk = pi.amount === order.total_cents;

        if (!currencyOk || !amountOk) {
          console.error(`Stripe Webhook: Amount/Currency Mismatch on Order ${orderId}. Expected ${order.total_cents} CAD, received ${pi.amount} ${pi.currency}`);
          
          // Set error message but do not mark paid
          await supabase
            .from("orders")
            .update({
              payment_status: "failed",
              last_payment_error_code: "amount_mismatch",
              last_payment_error_message: `Divergence de montant : Stripe=${pi.amount} ${pi.currency}, DB=${order.total_cents} CAD. Commande suspendue.`,
            })
            .eq("id", orderId);

          await supabase.from("admin_audit_logs").insert({
            order_id: orderId,
            action_type: "webhook_mismatch_warning",
            previous_status: order.payment_status,
            new_status: "failed",
            note: `Alerte : Divergence de montant/devise Stripe. Attendu: ${order.total_cents} cents CAD, reçu: ${pi.amount} cents ${pi.currency}. Commande suspendue.`,
          });
          break;
        }

        // Apply state transition only if not already paid/refunded/cancelled
        if (["paid", "refunded", "partially_refunded", "cancelled"].includes(order.payment_status)) {
          break;
        }

        const now = new Date().toISOString();

        // 1. Update Order status
        await supabase
          .from("orders")
          .update({
            payment_status: "paid",
            fulfillment_status: "confirmed", // Starts preparation!
            paid_at: now,
            stripe_latest_charge_id: pi.latest_charge as string,
            slot_hold_expires_at: null, // Slot booking made permanent!
          })
          .eq("id", orderId);

        // 2. Confirm promo code redemption
        await supabase
          .from("promo_code_redemptions")
          .update({
            status: "confirmed",
            confirmed_at: now,
            expires_at: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(), // extend expiration permanently
          })
          .eq("order_id", orderId)
          .eq("status", "reserved");

        // 3. Log Audit
        await supabase.from("admin_audit_logs").insert({
          order_id: orderId,
          action_type: "payment_success",
          previous_status: order.payment_status,
          new_status: "paid",
          amount_cents: pi.amount,
          note: `Paiement en ligne réussi de ${(pi.amount / 100).toFixed(2)} $ via Stripe Webhook.`,
        });

        // 4. Create Email Jobs for customer and admin
        const adminEmail = process.env.BRWN_ADMIN_EMAIL || "brwndesserts@gmail.com";
        await supabase.from("email_jobs").insert([
          {
            order_id: orderId,
            email_type: "order_confirmation",
            recipient: order.customer_email,
            status: "pending",
            max_attempts: 5,
          },
          {
            order_id: orderId,
            email_type: "admin_notification",
            recipient: adminEmail,
            status: "pending",
            max_attempts: 5,
          }
        ]);

        break;
      }

      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const orderId = pi.metadata.order_id;

        if (orderId) {
          const { data: order } = await supabase.from("orders").select("payment_status").eq("id", orderId).maybeSingle();
          if (order && order.payment_status === "pending") {
            await supabase
              .from("orders")
              .update({
                payment_status: "failed",
                last_payment_error_code: pi.last_payment_error?.code || "failed",
                last_payment_error_message: pi.last_payment_error?.message || "Échec de transaction carte",
              })
              .eq("id", orderId);

            await supabase.from("admin_audit_logs").insert({
              order_id: orderId,
              action_type: "payment_failed",
              previous_status: "pending",
              new_status: "failed",
              note: `Échec de transaction Stripe : ${pi.last_payment_error?.message || "Inconnu"}`,
            });
          }
        }
        break;
      }

      case "payment_intent.canceled": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const orderId = pi.metadata.order_id;

        if (orderId) {
          const { data: order } = await supabase.from("orders").select("payment_status, fulfillment_status").eq("id", orderId).maybeSingle();
          if (order && order.payment_status !== "paid") {
            const now = new Date().toISOString();
            // Cancel order, release slot, release promo
            await supabase
              .from("orders")
              .update({
                payment_status: "cancelled",
                fulfillment_status: "cancelled",
                slot_released_at: now,
                slot_hold_expires_at: now, // expire it
              })
              .eq("id", orderId);

            await supabase
              .from("promo_code_redemptions")
              .update({
                status: "released",
                released_at: now,
              })
              .eq("order_id", orderId);

            await supabase.from("admin_audit_logs").insert({
              order_id: orderId,
              action_type: "payment_cancelled",
              previous_status: order.payment_status,
              new_status: "cancelled",
              note: "Commande annulée suite à l'annulation du PaymentIntent Stripe.",
            });
          }
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const orderId = charge.metadata.order_id || (charge.payment_intent ? null : null); // fallback query
        
        let targetOrderId = orderId;
        if (!targetOrderId && charge.payment_intent) {
          const { data: o } = await supabase
            .from("orders")
            .select("id")
            .eq("stripe_payment_intent_id", charge.payment_intent as string)
            .maybeSingle();
          if (o) targetOrderId = o.id;
        }

        if (targetOrderId) {
          const { data: order } = await supabase
            .from("orders")
            .select("payment_status, total_cents, refunded_amount_cents")
            .eq("id", targetOrderId)
            .maybeSingle();

          if (order) {
            const refundCents = charge.amount_refunded;
            const newPaymentStatus = refundCents >= order.total_cents ? "refunded" : "partially_refunded";
            const now = new Date().toISOString();

            await supabase
              .from("orders")
              .update({
                payment_status: newPaymentStatus,
                refunded_amount_cents: refundCents,
                refunded_at: now,
                stripe_refund_id: charge.refunds?.data[0]?.id || null,
              })
              .eq("id", targetOrderId);

            await supabase.from("admin_audit_logs").insert({
              order_id: targetOrderId,
              action_type: "refund_processed",
              previous_status: order.payment_status,
              new_status: newPaymentStatus,
              amount_cents: refundCents - order.refunded_amount_cents,
              note: `Remboursement traité via Stripe Webhook de ${((refundCents - order.refunded_amount_cents) / 100).toFixed(2)} $. Total remboursé: ${(refundCents / 100).toFixed(2)} $.`,
            });
          }
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Failed to process Stripe Webhook Event:", err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
