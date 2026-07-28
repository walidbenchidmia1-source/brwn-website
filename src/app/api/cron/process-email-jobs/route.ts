import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import fs from "fs";
import path from "path";

export async function GET(req: Request) {
  try {
    // 1. Verify Vercel Cron Secret
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const workerId = `worker-${crypto.randomUUID().substring(0, 8)}`;

    console.log(`Worker ${workerId} starting processing of email jobs...`);

    // 2. Fetch and lock up to 10 jobs using skip locked RPC
    const { data: lockedJobs, error: lockErr } = await supabase.rpc(
      "lock_next_email_jobs",
      {
        p_worker_id: workerId,
        p_limit: 10,
      }
    );

    if (lockErr) {
      console.error("Lock next email jobs failed:", lockErr);
      return NextResponse.json({ error: "Failed to lock queue" }, { status: 500 });
    }

    if (!lockedJobs || lockedJobs.length === 0) {
      return NextResponse.json({ processed: 0, message: "Queue is empty" });
    }

    console.log(`Locked ${lockedJobs.length} email job(s) for processing.`);

    let processedCount = 0;
    const now = new Date().toISOString();

    for (const job of lockedJobs) {
      try {
        // Fetch order details
        const { data: order } = await supabase
          .from("orders")
          .select("*")
          .eq("id", job.order_id)
          .maybeSingle();

        if (!order) {
          throw new Error(`Order ${job.order_id} not found in database.`);
        }

        // Fetch order items
        const { data: items } = await supabase
          .from("order_items")
          .select("*")
          .eq("order_id", job.order_id);

        if (!items || items.length === 0) {
          throw new Error(`No items found for order ${order.order_number}`);
        }

        // Format dates & prices
        const formatPrice = (cents: number) => `${(cents / 100).toFixed(2)} $ CAD`;
        const formattedDate = new Date(order.service_date + "T00:00:00").toLocaleDateString("fr-CA", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        // 3. Generate HTML & Subject based on email type
        const emailSubject = job.email_type === "admin_notification"
          ? `🚨 Nouvelle commande reçue : ${order.order_number}`
          : `Confirmation de votre commande ${order.order_number} - BRWN`;

        const adminBanner = job.email_type === "admin_notification"
          ? `<div style="background-color: #3D2216; color: #F9F6F0; padding: 15px; border-radius: 12px; margin-bottom: 20px; font-weight: bold; font-size: 13px; font-family: sans-serif; line-height: 1.5;">
              🚨 [NOTIFICATION ADMIN] Une nouvelle commande vient d'être passée sur le site BRWN.
              Veuillez la préparer pour le créneau indiqué ci-dessous.
             </div>`
          : "";

        const titleText = job.email_type === "admin_notification"
          ? `Notification de Commande`
          : `Reçu de votre commande`;

        const greetingText = job.email_type === "admin_notification"
          ? `<p>Bonjour Admin,</p>
             <p>Une nouvelle commande a été passée par <strong>${order.customer_first_name} ${order.customer_last_name}</strong> (${order.customer_email}).</p>`
          : `<p>Bonjour <strong>${order.customer_first_name} ${order.customer_last_name}</strong>,</p>
             <p>Merci pour votre confiance ! Nous avons bien enregistré votre commande <strong>${order.order_number}</strong>.</p>`;

        const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${emailSubject}</title>
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #F9F6F0; color: #150B07; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; bg-color: #ffffff; border: 1px solid #3d22161a; border-radius: 16px; padding: 30px; background: white; }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { font-size: 24px; font-weight: 900; letter-spacing: 2px; color: #3D2216; text-transform: uppercase; }
    h1 { font-size: 22px; font-weight: 900; text-transform: uppercase; color: #3D2216; margin-top: 10px; }
    .details { background-color: #FAF7F2; border-radius: 12px; padding: 20px; margin-bottom: 25px; line-height: 1.6; font-size: 13px; }
    .section-title { font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; color: #C4A484; margin-bottom: 8px; }
    .items-table { w-width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 13px; width: 100%; }
    .items-table th { text-align: left; padding: 8px 0; border-bottom: 2px solid #3d22160d; color: #3D2216; font-weight: bold; }
    .items-table td { padding: 12px 0; border-bottom: 1px solid #3d22160a; }
    .totals { font-size: 13px; line-height: 1.8; text-align: right; }
    .totals div { display: flex; justify-content: space-between; max-width: 250px; margin-left: auto; }
    .total-row { font-size: 15px; font-weight: 900; color: #3D2216; border-top: 1px solid #3D2216; padding-top: 8px; margin-top: 8px; }
    .footer { text-align: center; margin-top: 40px; font-size: 11px; color: #3d221666; }
  </style>
</head>
<body>
  <div class="container">
    ${adminBanner}
    <div class="header">
      <div class="logo">BRWN</div>
      <h1>${titleText}</h1>
    </div>
    
    ${greetingText}
    
    <div class="details">
      <div class="section-title">Mode et créneau</div>
      <strong>${order.fulfillment_type === "delivery" ? "Livraison à domicile" : "Cueillette sur place"}</strong><br>
      Date : ${formattedDate}<br>
      ${order.fulfillment_type === "delivery" ? `Adresse : ${order.delivery_address} ${order.delivery_apartment || ""}, ${order.delivery_city}, ${order.delivery_postal_code}` : "Lieu : 123 Rue de Tiramisu, Montréal, QC"}<br>
      ${order.delivery_instructions ? `Instructions livraison : ${order.delivery_instructions}<br>` : ""}
      ${order.order_notes ? `Note de commande : ${order.order_notes}<br>` : ""}
      <br>
      <div class="section-title">Paiement</div>
      Méthode : ${order.payment_method === "stripe" ? "Carte en ligne (Stripe)" : order.payment_method === "on_delivery" ? "À la livraison" : "À la cueillette"}<br>
      Statut : ${order.payment_status === "paid" ? "Payé" : order.payment_status === "cash_on_delivery" ? "À régler à la livraison" : "À régler à la cueillette"}<br>
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
        ${items
          .map(
            (item) => `
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
      ${order.discount_cents > 0 ? `
      <div style="color: green;">
        <span>Rabais promo :</span>
        <span>-${formatPrice(order.discount_cents)}</span>
      </div>
      ` : ""}
      <div>
        <span>Frais de livraison :</span>
        <span>${order.delivery_fee_cents === 0 ? "Gratuit" : formatPrice(order.delivery_fee_cents)}</span>
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
      © ${new Date().getFullYear()} BRWN Montréal. Fait main avec passion.<br>
      Pour toute question, contactez-nous à support@brwn.ca
    </div>
  </div>
</body>
</html>
        `;

        // 4. Save email HTML file locally (acts as concrete proof of receipt creation)
        const emailsDir = path.join("C:", "Users", "ipado", ".gemini", "antigravity", "brain", "5464f3f8-6c2e-43fb-b365-f28e82ad35a2", "scratch", "emails");

        if (!fs.existsSync(emailsDir)) {
          fs.mkdirSync(emailsDir, { recursive: true });
        }

        const emailPath = path.join(emailsDir, `order-${order.order_number}-${job.email_type}.html`);
        fs.writeFileSync(emailPath, html, "utf-8");
        console.log(`Email receipt written successfully to: ${emailPath}`);

        // 5. Send actual email if Resend API Key is configured
        const resendApiKey = process.env.RESEND_API_KEY;
        if (resendApiKey) {
          console.log(`Sending email job ${job.id} via Resend...`);
          const fromEmail = process.env.BRWN_EMAIL_FROM || "onboarding@resend.dev";
          const resendResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: fromEmail,
              to: job.recipient,
              subject: emailSubject,
              html: html,
            }),
          });

          if (!resendResponse.ok) {
            const errBody = await resendResponse.text();
            throw new Error(`Resend REST API failed: ${resendResponse.statusText} - ${errBody}`);
          }
          const resendData = await resendResponse.json();
          console.log(`Resend send email success! ID: ${resendData.id}`);
        } else {
          console.log(`[Simulation Mode] No RESEND_API_KEY environment variable found. Email job logged to: ${emailPath}`);
        }

        // 6. Update job to success in DB
        await supabase
          .from("email_jobs")
          .update({
            status: "sent",
            sent_at: now,
            locked_at: null,
            locked_by: null,
          })
          .eq("id", job.id);

        // Update corresponding timestamp on orders
        if (job.email_type === "order_confirmation") {
          await supabase
            .from("orders")
            .update({ confirmation_email_sent_at: now })
            .eq("id", order.id);
        } else if (job.email_type === "admin_notification") {
          await supabase
            .from("orders")
            .update({ admin_notification_sent_at: now })
            .eq("id", order.id);
        }

        processedCount++;
      } catch (err: any) {
        console.error(`Failed to process email job ${job.id}:`, err);

        const nextAttemptCount = job.attempt_count + 1;
        const nextAttemptAt = new Date(Date.now() + nextAttemptCount * 2 * 60000).toISOString(); // progress delay: 2, 4, 6...

        const finalStatus = nextAttemptCount >= 5 ? "dead" : "failed";

        // Update job to fail
        await supabase
          .from("email_jobs")
          .update({
            status: finalStatus,
            attempt_count: nextAttemptCount,
            next_attempt_at: nextAttemptAt,
            last_error: err.message || String(err),
            locked_at: null,
            locked_by: null,
          })
          .eq("id", job.id);
      }
    }

    return NextResponse.json({
      success: true,
      processed: processedCount,
      timestamp: now,
    });
  } catch (err: any) {
    console.error("Failed in cron email process routine:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
