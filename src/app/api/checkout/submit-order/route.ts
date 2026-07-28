import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import Stripe from "stripe";
import { z } from "zod";

// Zod Validation Schema
const submitOrderSchema = z.object({
  checkoutAttemptId: z.string().uuid(),
  customerFirstName: z.string().min(1).max(100),
  customerLastName: z.string().min(1).max(100),
  customerEmail: z.string().email().max(100),
  customerPhone: z.string().min(7).max(30),
  fulfillmentType: z.enum(["delivery", "pickup"]),
  deliveryAddress: z.string().max(255).optional().nullable(),
  deliveryApartment: z.string().max(50).optional().nullable(),
  deliveryCity: z.string().max(100).optional().nullable(),
  deliveryProvince: z.string().max(50).optional().nullable().default("Québec"),
  deliveryPostalCode: z.string().max(20).optional().nullable(),
  deliveryInstructions: z.string().max(500).optional().nullable(),
  orderNotes: z.string().max(500).optional().nullable(),
  serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  availabilitySlotId: z.string().uuid(),
  paymentMethod: z.enum(["stripe", "on_delivery", "on_pickup"]),
  promoCode: z.string().max(50).optional().nullable(),
  termsAccepted: z.literal(true),
  allergenNoticeAccepted: z.literal(true),
  items: z.array(
    z.object({
      productId: z.string().uuid(),
      quantity: z.number().int().positive(),
      format: z.string().min(1).max(100),
    })
  ).min(1),
});

// Price multiplier function based on format
const getFormatPriceCents = (basePriceCents: number, format: string): number => {
  const norm = format.trim().toLowerCase();
  if (norm === "le duo" || norm === "duo") return Math.round(basePriceCents * 1.8);
  if (norm === "le deluxe box" || norm === "deluxe box" || norm === "le deluxe") return Math.round(basePriceCents * 3.2);
  return basePriceCents;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 1. Zod schema validation
    const parsed = submitOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données de validation incorrectes.", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const val = parsed.data;
    const supabase = createAdminClient();

    // 2. Normalization of postal code
    const rawPostalCode = val.deliveryPostalCode ? val.deliveryPostalCode.trim().toUpperCase().replace(/\s+/g, "") : null;

    // 3. Compute cart fingerprint
    const sortedItems = [...val.items].sort(
      (a, b) => a.productId.localeCompare(b.productId) || a.format.localeCompare(b.format)
    );
    const cartFingerprint = JSON.stringify({
      items: sortedItems.map((i) => ({ p: i.productId, q: i.quantity, f: i.format })),
      fulfillmentType: val.fulfillmentType,
      postalCode: rawPostalCode || "",
      promoCode: val.promoCode ? val.promoCode.trim().toUpperCase() : "",
      slotId: val.availabilitySlotId,
      date: val.serviceDate,
    });

    // 4. Idempotence Check
    const { data: existingOrder, error: checkError } = await supabase
      .from("orders")
      .select("*")
      .eq("checkout_attempt_id", val.checkoutAttemptId)
      .maybeSingle();

    if (checkError) {
      console.error("Database query error:", checkError);
      return NextResponse.json({ error: "Erreur de base de données." }, { status: 500 });
    }

    if (existingOrder) {
      // Compare fingerprint
      if (existingOrder.cart_fingerprint !== cartFingerprint) {
        return NextResponse.json(
          { error: "Le panier a changé depuis le début de la commande. Veuillez actualiser le panier et recommencer." },
          { status: 409 }
        );
      }

      // Return existing order
      let clientSecret = null;
      if (val.paymentMethod === "stripe" && existingOrder.stripe_payment_intent_id) {
        const stripeKey = process.env.STRIPE_SECRET_KEY;
        if (stripeKey) {
          const stripe = new Stripe(stripeKey, { apiVersion: "2022-11-15" as any });
          const pi = await stripe.paymentIntents.retrieve(existingOrder.stripe_payment_intent_id);
          clientSecret = pi.client_secret;
        }
      }

      return NextResponse.json({
        orderId: existingOrder.id,
        orderNumber: existingOrder.order_number,
        publicToken: existingOrder.public_token,
        clientSecret,
        totalCents: existingOrder.total_cents,
      });
    }

    // 5. Fetch Settings
    const { data: settings } = await supabase
      .from("store_settings")
      .select("*")
      .eq("id", "global")
      .maybeSingle();

    const hasStripeKeys = !!(process.env.STRIPE_SECRET_KEY && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
    const storeSettings = {
      ...(settings || {
        min_order_cents: 1500,
        free_delivery_min_cents: 5000,
        tax_rate_gst: 0.05,
        tax_rate_qst: 0.09975,
        stripe_enabled: true,
        cod_enabled: true,
        cop_enabled: true,
      }),
      stripe_enabled: hasStripeKeys && (settings ? settings.stripe_enabled : true),
    };

    if (val.paymentMethod === "stripe" && !storeSettings.stripe_enabled) {
      return NextResponse.json({ error: "Le paiement en ligne est désactivé." }, { status: 400 });
    }
    if (val.paymentMethod === "on_delivery" && !storeSettings.cod_enabled) {
      return NextResponse.json({ error: "Le paiement à la livraison est désactivé." }, { status: 400 });
    }
    if (val.paymentMethod === "on_pickup" && !storeSettings.cop_enabled) {
      return NextResponse.json({ error: "Le paiement à la cueillette est désactivé." }, { status: 400 });
    }

    // 6. Fetch Products and check prices
    const productIds = val.items.map((i) => i.productId);
    const { data: dbProducts, error: prodErr } = await supabase
      .from("products")
      .select("id, name, price_cents, tax_category, is_zero_rated, allergens, is_active")
      .in("id", productIds);

    if (prodErr || !dbProducts || dbProducts.length !== productIds.length) {
      return NextResponse.json({ error: "Un ou plusieurs produits sont introuvables." }, { status: 400 });
    }

    // Map database details
    const productMap = new Map<string, typeof dbProducts[0]>();
    for (const p of dbProducts) {
      if (!p.is_active) {
        return NextResponse.json({ error: `Le produit "${p.name}" n'est plus actif.` }, { status: 400 });
      }
      productMap.set(p.id, p);
    }

    let subtotalCents = 0;
    const itemsData = val.items.map((item) => {
      const dbProd = productMap.get(item.productId)!;
      const unitPriceCents = getFormatPriceCents(dbProd.price_cents, item.format);
      const lineTotalCents = unitPriceCents * item.quantity;
      subtotalCents += lineTotalCents;

      return {
        product_id: item.productId,
        quantity: item.quantity,
        unit_price_cents: unitPriceCents,
        line_total_cents: lineTotalCents,
        flavor: dbProd.name,
        format: item.format,
        allergens_snapshot: dbProd.allergens || [],
        tax_category_snapshot: dbProd.is_zero_rated ? "zero-rated" : (dbProd.tax_category || "taxable"),
      };
    });

    if (subtotalCents < storeSettings.min_order_cents) {
      return NextResponse.json(
        { error: `Le montant minimum de commande est de ${(storeSettings.min_order_cents / 100).toFixed(2)} $.` },
        { status: 400 }
      );
    }

    // 7. Promo Code check
    let discountCents = 0;
    let appliedPromoId = null;

    if (val.promoCode) {
      const { data: promo } = await supabase
        .from("promo_codes")
        .select("*")
        .eq("code", val.promoCode.trim().toUpperCase())
        .eq("is_active", true)
        .maybeSingle();

      if (!promo) {
        return NextResponse.json({ error: "Code promotionnel invalide." }, { status: 400 });
      }

      // Check min order for promo
      if (subtotalCents < promo.min_order_cents) {
        return NextResponse.json(
          { error: `Ce code nécessite un achat minimum de ${(promo.min_order_cents / 100).toFixed(2)} $.` },
          { status: 400 }
        );
      }

      // Reserve atomically via the private schema function
      const isStripe = val.paymentMethod === "stripe";
      const { data: reserved, error: reserveError } = await supabase.rpc(
        "reserve_promo_code",
        {
          p_code_id: promo.id,
          p_order_id: null,
          p_checkout_attempt_id: val.checkoutAttemptId,
          p_client_email: val.customerEmail,
          p_expires_in_minutes: 30,
        }
      );

      if (reserveError || !reserved) {
        console.error("Promo code reservation error:", reserveError);
        return NextResponse.json({ error: "Ce code promo a atteint sa limite d'utilisation." }, { status: 400 });
      }

      // Compute discount value
      if (promo.discount_type === "percentage") {
        discountCents = Math.round((subtotalCents * promo.discount_value) / 100);
      } else {
        discountCents = promo.discount_value;
      }

      if (promo.max_discount_cents && discountCents > promo.max_discount_cents) {
        discountCents = promo.max_discount_cents;
      }

      discountCents = Math.min(discountCents, subtotalCents);
      appliedPromoId = promo.id;
    }

    // 8. Delivery Fee
    let deliveryFeeCents = 0;
    if (val.fulfillmentType === "delivery") {
      if (!rawPostalCode) {
        return NextResponse.json({ error: "Le code postal est requis pour la livraison." }, { status: 400 });
      }

      // Find matching delivery zone
      const postalPrefix = rawPostalCode.substring(0, 3);
      const { data: zone } = await supabase
        .from("delivery_zones")
        .select("*")
        .eq("is_active", true)
        .maybeSingle(); // Wait! Let's query by array contains

      const { data: matchingZones } = await supabase
        .from("delivery_zones")
        .select("*")
        .eq("is_active", true);

      const activeZone = (matchingZones || []).find((z) =>
        z.postal_code_prefixes.some((p: string) => p.trim().toUpperCase() === postalPrefix)
      );

      if (!activeZone) {
        // Rollback promo hold
        if (appliedPromoId) {
          await supabase.rpc("release_promo_redemption", { p_checkout_attempt_id: val.checkoutAttemptId });
        }
        return NextResponse.json({ error: "Désolé, nous ne livrons pas dans votre secteur postal." }, { status: 400 });
      }

      if (subtotalCents < activeZone.min_order_cents) {
        if (appliedPromoId) {
          await supabase.rpc("release_promo_redemption", { p_checkout_attempt_id: val.checkoutAttemptId });
        }
        return NextResponse.json(
          { error: `Le montant minimum pour la livraison dans votre secteur est de ${(activeZone.min_order_cents / 100).toFixed(2)} $.` },
          { status: 400 }
        );
      }

      if (subtotalCents >= storeSettings.free_delivery_min_cents) {
        deliveryFeeCents = 0;
      } else {
        deliveryFeeCents = activeZone.delivery_fee_cents;
      }
    }

    // 9. Taxes Recalculation item-by-item
    let totalGstCents = 0;
    let totalQstCents = 0;

    for (const item of itemsData) {
      if (item.tax_category_snapshot === "zero-rated") {
        continue;
      }
      
      // Pro-rate line total after discount
      const lineProRata = subtotalCents > 0 ? (item.line_total_cents / subtotalCents) : 0;
      const lineDiscount = Math.round(discountCents * lineProRata);
      const lineTaxableCents = Math.max(0, item.line_total_cents - lineDiscount);

      totalGstCents += Math.round(lineTaxableCents * Number(storeSettings.tax_rate_gst));
      totalQstCents += Math.round(lineTaxableCents * Number(storeSettings.tax_rate_qst));
    }

    const totalCents = subtotalCents - discountCents + deliveryFeeCents + totalGstCents + totalQstCents;

    // 10. Availability Slot checks (Atomic)
    const isStripe = val.paymentMethod === "stripe";
    const { data: slotReserved, error: slotError } = await supabase.rpc(
      "check_and_reserve_slot",
      {
        p_availability_slot_id: val.availabilitySlotId,
        p_service_date: val.serviceDate,
        p_fulfillment_type: val.fulfillmentType,
        p_checkout_attempt_id: val.checkoutAttemptId,
        p_order_id: null,
        p_hold_duration_minutes: 15,
        p_is_temporary: isStripe,
      }
    );

    if (slotError || !slotReserved) {
      console.error("Slot atomic check failed:", slotError);
      if (appliedPromoId) {
        await supabase.rpc("release_promo_redemption", { p_checkout_attempt_id: val.checkoutAttemptId });
      }
      return NextResponse.json({ error: "Ce créneau de livraison ou de ramassage est complet." }, { status: 400 });
    }

    // 11. Generate order number atomically
    const { data: seqVal, error: seqErr } = await supabase.rpc("orders_seq_next");
    if (seqErr) {
      console.error("Sequence generation error:", seqErr);
    }
    const nextVal = seqVal ? Number(seqVal) : (Math.floor(Math.random() * 90000) + 10000);
    const orderNumber = `BRWN-${nextVal}`;

    // 12. Create the order
    const now = new Date().toISOString();
    const slotHoldExpires = isStripe ? new Date(Date.now() + 15 * 60000).toISOString() : null;

    const newOrderData = {
      order_number: orderNumber,
      checkout_attempt_id: val.checkoutAttemptId,
      public_token: crypto.randomUUID(),
      customer_first_name: val.customerFirstName,
      customer_last_name: val.customerLastName,
      customer_email: val.customerEmail,
      customer_phone: val.customerPhone,
      fulfillment_type: val.fulfillmentType,
      delivery_address: val.deliveryAddress,
      delivery_apartment: val.deliveryApartment,
      delivery_city: val.deliveryCity,
      delivery_province: val.deliveryProvince,
      delivery_postal_code: rawPostalCode,
      delivery_instructions: val.deliveryInstructions,
      order_notes: val.orderNotes,
      service_date: val.serviceDate,
      availability_slot_id: val.availabilitySlotId,
      slot_reserved_at: now,
      slot_hold_expires_at: slotHoldExpires,
      subtotal_cents: subtotalCents,
      discount_cents: discountCents,
      delivery_fee_cents: deliveryFeeCents,
      gst_amount_cents: totalGstCents,
      qst_amount_cents: totalQstCents,
      total_cents: totalCents,
      payment_method: val.paymentMethod,
      payment_status: isStripe ? "pending" : (val.paymentMethod === "on_delivery" ? "cash_on_delivery" : "pay_on_pickup"),
      fulfillment_status: isStripe ? "pending" : "confirmed",
      promo_code_id: appliedPromoId,
      terms_accepted_at: now,
      allergen_notice_accepted_at: now,
      terms_version: "1.0",
      allergen_notice_version: "1.0",
      cart_fingerprint: cartFingerprint,
    };

    const { data: order, error: insertErr } = await supabase
      .from("orders")
      .insert(newOrderData)
      .select("id")
      .single();

    if (insertErr || !order) {
      console.error("Order insertion error:", insertErr);
      // Release slot hold
      if (appliedPromoId) {
        await supabase.rpc("release_promo_redemption", { p_checkout_attempt_id: val.checkoutAttemptId });
      }
      return NextResponse.json({ error: "Échec de l'enregistrement de la commande." }, { status: 500 });
    }

    // 13. Create order items
    const orderItemsToInsert = itemsData.map((item) => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price_cents: item.unit_price_cents,
      line_total_cents: item.line_total_cents,
      flavor: item.flavor,
      format: item.format,
      allergens_snapshot: item.allergens_snapshot,
      tax_category_snapshot: item.tax_category_snapshot,
    }));

    const { error: itemsErr } = await supabase
      .from("order_items")
      .insert(orderItemsToInsert);

    if (itemsErr) {
      console.error("Order items insertion error:", itemsErr);
      // Clean up
      await supabase.from("orders").delete().eq("id", order.id);
      if (appliedPromoId) {
        await supabase.rpc("release_promo_redemption", { p_checkout_attempt_id: val.checkoutAttemptId });
      }
      return NextResponse.json({ error: "Échec de l'enregistrement des articles." }, { status: 500 });
    }

    // 14. Update promo redemption link
    if (appliedPromoId) {
      await supabase.rpc("confirm_promo_redemption", {
        p_checkout_attempt_id: val.checkoutAttemptId,
        p_order_id: order.id,
      });
    }

    // 15. Stripe Payment Intent creation (if Stripe)
    if (isStripe) {
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeKey) {
        // Rollback
        await supabase.from("orders").delete().eq("id", order.id);
        if (appliedPromoId) {
          await supabase.rpc("release_promo_redemption", { p_checkout_attempt_id: val.checkoutAttemptId });
        }
        return NextResponse.json(
          { error: "Paiement Stripe non configuré côté serveur. Veuillez sélectionner un autre moyen de paiement." },
          { status: 400 }
        );
      }

      try {
        const stripe = new Stripe(stripeKey, { apiVersion: "2022-11-15" as any });
        const paymentIntent = await stripe.paymentIntents.create(
          {
            amount: totalCents,
            currency: "cad",
            metadata: {
              order_id: order.id,
              checkout_attempt_id: val.checkoutAttemptId,
            },
          },
          {
            idempotencyKey: `brwn-payment-${order.id}`,
          }
        );

        // Save Stripe PI in order
        await supabase
          .from("orders")
          .update({ stripe_payment_intent_id: paymentIntent.id })
          .eq("id", order.id);

        return NextResponse.json({
          orderId: order.id,
          orderNumber: orderNumber,
          publicToken: newOrderData.public_token,
          clientSecret: paymentIntent.client_secret,
          totalCents: totalCents,
        });
      } catch (err: any) {
        console.error("Stripe payment intent creation error:", err);
        // Rollback
        await supabase.from("orders").delete().eq("id", order.id);
        if (appliedPromoId) {
          await supabase.rpc("release_promo_redemption", { p_checkout_attempt_id: val.checkoutAttemptId });
        }
        return NextResponse.json({ error: "Échec de la génération de l'intention de paiement." }, { status: 500 });
      }
    }

    // 16. Offline Payment (COD/COP)
    // Add email notifications for customer and admin
    const adminEmail = process.env.BRWN_ADMIN_EMAIL || "brwndesserts@gmail.com";
    await supabase.from("email_jobs").insert([
      {
        order_id: order.id,
        email_type: "order_confirmation",
        recipient: val.customerEmail,
        status: "pending",
        max_attempts: 5,
      },
      {
        order_id: order.id,
        email_type: "admin_notification",
        recipient: adminEmail,
        status: "pending",
        max_attempts: 5,
      }
    ]);

    return NextResponse.json({
      orderId: order.id,
      orderNumber: orderNumber,
      publicToken: newOrderData.public_token,
      clientSecret: null,
      totalCents: totalCents,
    });
  } catch (err: any) {
    console.error("General submit order failure:", err);
    return NextResponse.json({ error: "Une erreur inattendue est survenue." }, { status: 500 });
  }
}
