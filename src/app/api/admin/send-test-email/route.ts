import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const recipientEmail = (body.recipientEmail || "").trim();
    const customerFirstName = (body.customerFirstName || "Client").trim();
    const orderNumber = (body.orderNumber || "TEST-1001").trim();
    const fulfillmentType = body.fulfillmentType === "delivery" ? "delivery" : "pickup";

    if (!recipientEmail || !recipientEmail.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Veuillez fournir une adresse e-mail valide." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // 1. Fetch or create test order in database
    let { data: order } = await supabase
      .from("orders")
      .select("*")
      .eq("order_number", orderNumber)
      .maybeSingle();

    if (!order) {
      const isDelivery = fulfillmentType === "delivery";
      const subtotalCents = 2400;
      const deliveryFeeCents = isDelivery ? 500 : 0;
      const gstCents = 120;
      const qstCents = 239;
      const totalCents = subtotalCents + deliveryFeeCents + gstCents + qstCents;
      const todayStr = new Date().toISOString().split("T")[0];

      // Fetch any active slot for availability_slot_id
      const { data: slotData } = await supabase
        .from("availability_slots")
        .select("id")
        .limit(1)
        .maybeSingle();

      const slotId = slotData?.id || crypto.randomUUID();

      const { data: newOrder, error: orderErr } = await supabase
        .from("orders")
        .insert({
          order_number: orderNumber,
          checkout_attempt_id: crypto.randomUUID(),
          public_token: crypto.randomUUID(),
          customer_first_name: customerFirstName,
          customer_last_name: "Test",
          customer_email: recipientEmail,
          customer_phone: "514-555-0199",
          fulfillment_type: fulfillmentType,
          delivery_address: isDelivery ? "1234 Rue St-Denis" : null,
          delivery_city: isDelivery ? "Montréal" : null,
          delivery_postal_code: isDelivery ? "H2X 3K4" : null,
          delivery_instructions: isDelivery ? "Laisser devant la porte" : null,
          service_date: todayStr,
          availability_slot_id: slotId,
          payment_method: isDelivery ? "on_delivery" : "on_pickup",
          payment_status: isDelivery ? "cash_on_delivery" : "pay_on_pickup",
          fulfillment_status: "confirmed",
          subtotal_cents: subtotalCents,
          discount_cents: 0,
          delivery_fee_cents: deliveryFeeCents,
          gst_amount_cents: gstCents,
          qst_amount_cents: qstCents,
          total_cents: totalCents,
          terms_accepted_at: new Date().toISOString(),
          allergen_notice_accepted_at: new Date().toISOString(),
          terms_version: "1.0",
          allergen_notice_version: "1.0",
          cart_fingerprint: "test-cart-fingerprint",
          environment: "test",
        })
        .select("*")
        .single();

      if (orderErr || !newOrder) {
        console.error("Failed to create test order:", orderErr);
        return NextResponse.json(
          { success: false, error: `Erreur création commande de test: ${orderErr?.message || "Erreur DB"}` },
          { status: 500 }
        );
      }

      order = newOrder;

      // Insert test order item
      await supabase.from("order_items").insert({
        order_id: order.id,
        product_id: "1537017b-acdb-43c7-9c0b-526d76d395e4",
        quantity: 1,
        unit_price_cents: 2400,
        line_total_cents: 2400,
        flavor: "Tiramisu Pistache",
        format: "Le Solo",
        allergens_snapshot: ["Lait", "Gluten", "Œufs"],
        tax_category_snapshot: "taxable",
      });
    }

    // 2. Idempotency Check: test-receipt-{order_id}-{recipient_email}
    const idempotencyKey = `test-receipt-${order.id}-${recipientEmail}`;
    const { data: existingJob } = await supabase
      .from("email_jobs")
      .select("*")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existingJob && existingJob.status === "sent") {
      return NextResponse.json({
        success: true,
        message: `Cet e-mail de test a déjà été envoyé (Clé d'idempotence: ${idempotencyKey}).`,
        providerMessageId: existingJob.provider_message_id || "idempotent_duplicate",
        alreadySent: true,
        sentAt: existingJob.sent_at,
      });
    }

    // 3. Fetch order items
    const { data: items } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", order.id);

    const itemsList = items && items.length > 0 ? items : [
      { flavor: "Tiramisu Pistache", format: "Le Solo", quantity: 1, line_total_cents: 2400 }
    ];

    // Formatters
    const formatPrice = (cents: number) => `${(cents / 100).toFixed(2)} $ CAD`;
    const formattedDate = new Date(order.service_date + "T00:00:00").toLocaleDateString("fr-CA", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const isPickup = order.fulfillment_type === "pickup";
    const paymentNotice = isPickup
      ? "Paiement à effectuer lors de la cueillette."
      : "Paiement à effectuer à la livraison.";

    const emailSubject = `Confirmation de votre commande ${order.order_number} - BRWN (TEST)`;
    const adminEmail = process.env.BRWN_ADMIN_EMAIL || "brwndesserts@gmail.com";
    const fromAddress = process.env.BRWN_EMAIL_FROM || "onboarding@resend.dev";

    // Build Email HTML Body
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${emailSubject}</title>
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #F9F6F0; color: #150B07; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border: 1px solid #3d22161a; border-radius: 16px; padding: 30px; }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { font-size: 26px; font-weight: 900; letter-spacing: 3px; color: #3D2216; text-transform: uppercase; }
    h1 { font-size: 20px; font-weight: 900; text-transform: uppercase; color: #3D2216; margin-top: 10px; }
    .details { background-color: #FAF7F2; border-radius: 12px; padding: 20px; margin-bottom: 25px; line-height: 1.6; font-size: 13px; }
    .section-title { font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; color: #C4A484; margin-bottom: 8px; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 13px; }
    .items-table th { text-align: left; padding: 8px 0; border-bottom: 2px solid #3d22160d; color: #3D2216; font-weight: bold; }
    .items-table td { padding: 12px 0; border-bottom: 1px solid #3d22160a; }
    .totals { font-size: 13px; line-height: 1.8; text-align: right; }
    .totals div { display: flex; justify-content: space-between; max-width: 250px; margin-left: auto; }
    .total-row { font-size: 15px; font-weight: 900; color: #3D2216; border-top: 1px solid #3D2216; padding-top: 8px; margin-top: 8px; }
    .notice-box { background-color: #3D2216; color: #F9F6F0; padding: 14px; border-radius: 10px; font-weight: bold; font-size: 12px; margin-top: 15px; text-align: center; }
    .footer { text-align: center; margin-top: 40px; font-size: 11px; color: #3d221666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">BRWN</div>
      <h1>Confirmation de votre commande</h1>
    </div>
    
    <p>Bonjour <strong>${customerFirstName}</strong>,</p>
    <p>Merci pour votre confiance ! Voici le récapitulatif de votre commande <strong>${order.order_number}</strong>.</p>
    
    <div class="details">
      <div class="section-title">Mode & Créneau de Service</div>
      <strong>${isPickup ? "Cueillette en boutique" : "Livraison à domicile"}</strong><br>
      Date : ${formattedDate}<br>
      Créneau : ${order.time_slot || "13:00 - 16:00"}<br>
      ${isPickup ? "Lieu : 123 Rue de Tiramisu, Montréal, QC" : `Adresse : ${order.delivery_address || ""}, ${order.delivery_city || "Montréal"}, ${order.delivery_postal_code || ""}`}<br>
      <br>
      <div class="section-title">Statut du Paiement</div>
      Mode : ${order.payment_method === "on_delivery" ? "Paiement à la livraison" : "Paiement à la cueillette"}<br>
      Statut : <strong style="color: #D97706;">${paymentNotice}</strong>
      
      <div class="notice-box">
        📌 ${paymentNotice}
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th>Produit</th>
          <th style="text-align: center;">Quantité</th>
          <th style="text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsList
          .map(
            (item: any) => `
          <tr>
            <td>
              <strong>${item.flavor}</strong><br>
              <span style="font-size: 11px; color: #C4A484; font-weight: bold; text-transform: uppercase;">${item.format}</span>
            </td>
            <td style="text-align: center;">${item.quantity}</td>
            <td style="text-align: right;">${formatPrice(item.line_total_cents)}</td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>

    <div class="totals">
      <div>
        <span>Sous-total :</span>
        <span>${formatPrice(order.subtotal_cents)}</span>
      </div>
      <div>
        <span>Frais de livraison :</span>
        <span>${order.delivery_fee_cents === 0 ? "Gratuit (0.00 $ CAD)" : formatPrice(order.delivery_fee_cents)}</span>
      </div>
      <div>
        <span>TPS (5%) :</span>
        <span>${formatPrice(order.gst_amount_cents)}</span>
      </div>
      <div>
        <span>TVQ (9.975%) :</span>
        <span>${formatPrice(order.qst_amount_cents)}</span>
      </div>
      <div class="total-row">
        <span>Total :</span>
        <span>${formatPrice(order.total_cents)}</span>
      </div>
    </div>

    <div class="footer">
      © ${new Date().getFullYear()} BRWN Desserts. Tous droits réservés.<br>
      Pour toute question, contactez-nous à support@brwn.ca ou commandes@brwn.ca
    </div>
  </div>
</body>
</html>
`;

    let providerMessageId: string | null = null;
    let lastError: string | null = null;
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "La clé API Resend (RESEND_API_KEY) n'est pas encore configurée dans les variables d'environnement Vercel.",
        },
        { status: 400 }
      );
    }

    try {
      // Send main customer receipt email via Resend
      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromAddress,
          to: recipientEmail,
          subject: emailSubject,
          html: html,
        }),
      });

      const resendJson = await resendRes.json();
      if (resendRes.ok && resendJson.id) {
        providerMessageId = resendJson.id;
      } else {
        const errorDetail = resendJson.message || resendJson.error || JSON.stringify(resendJson);
        lastError = `Erreur API Resend (${resendRes.status}) : ${errorDetail}`;
      }

      // Also send admin notification copy to BRWN_ADMIN_EMAIL if different
      if (!lastError && adminEmail && adminEmail.toLowerCase() !== recipientEmail.toLowerCase()) {
        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: fromAddress,
              to: adminEmail,
              subject: `🚨 [COPIE ADMIN TEST] ${emailSubject}`,
              html: `<div style="background:#3D2216;color:#F9F6F0;padding:12px;border-radius:8px;font-weight:bold;margin-bottom:15px;">Notification Copie Administrateur BRWN (${adminEmail})</div>` + html,
            }),
          });
        } catch (adminErr) {
          console.error("Admin copy email send error:", adminErr);
        }
      }
    } catch (err: any) {
      lastError = `Erreur réseau Resend : ${err.message || String(err)}`;
    }

    const now = new Date().toISOString();
    const finalStatus = lastError ? "failed" : "sent";

    // Record in email_jobs
    if (existingJob) {
      await supabase
        .from("email_jobs")
        .update({
          status: finalStatus,
          sent_at: lastError ? null : now,
          last_error: lastError,
          provider_message_id: providerMessageId,
          attempt_count: (existingJob.attempt_count || 0) + 1,
        })
        .eq("id", existingJob.id);
    } else {
      await supabase.from("email_jobs").insert({
        order_id: order.id,
        email_type: "test_receipt",
        recipient: recipientEmail,
        idempotency_key: idempotencyKey,
        status: finalStatus,
        attempt_count: 1,
        sent_at: lastError ? null : now,
        last_error: lastError,
        provider_message_id: providerMessageId,
      });
    }

    if (lastError) {
      return NextResponse.json(
        {
          success: false,
          error: lastError,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `E-mail envoyé avec succès ! (ID: ${providerMessageId})`,
      providerMessageId: providerMessageId,
      recipient: recipientEmail,
      adminCopySentTo: adminEmail,
      idempotencyKey: idempotencyKey,
    });
  } catch (err: any) {
    console.error("Test email route error:", err);
    return NextResponse.json(
      { success: false, error: `Erreur interne : ${err.message || String(err)}` },
      { status: 500 }
    );
  }
}
