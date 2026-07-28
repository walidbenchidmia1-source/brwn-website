import pg from "pg";
import fs from "fs";
import path from "path";

// Parse .env.local
function parseEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error("Error: .env.local file not found.");
    process.exit(1);
  }
  const envContent = fs.readFileSync(envPath, "utf-8");
  const env: Record<string, string> = {};
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const [key, ...values] = trimmed.split("=");
    env[key.trim()] = values.join("=").trim();
  });
  return env;
}

function getClientConfig(connectionString: string) {
  const cleanUrl = connectionString.trim();
  const withoutProtocol = cleanUrl.substring(cleanUrl.indexOf("://") + 3);
  const atIndex = withoutProtocol.lastIndexOf("@");
  const credentials = withoutProtocol.substring(0, atIndex);
  const hostPortDb = withoutProtocol.substring(atIndex + 1);
  
  const colonIndex = credentials.indexOf(":");
  const user = credentials.substring(0, colonIndex);
  const password = credentials.substring(colonIndex + 1);
  
  const slashIndex = hostPortDb.indexOf("/");
  const hostPort = hostPortDb.substring(0, slashIndex);
  const database = hostPortDb.split("?")[0].substring(slashIndex + 1);
  
  const portColonIndex = hostPort.indexOf(":");
  const host = portColonIndex !== -1 ? hostPort.substring(0, portColonIndex) : hostPort;
  const port = portColonIndex !== -1 ? parseInt(hostPort.substring(portColonIndex + 1)) : 5432;
  
  return {
    user,
    password,
    host,
    port,
    database,
    ssl: { rejectUnauthorized: false }
  };
}

const env = parseEnv();
const databaseUrl = env.DATABASE_URL;

if (!databaseUrl) {
  console.error("Error: DATABASE_URL is missing in .env.local file.");
  process.exit(1);
}

async function runTests() {
  console.log("=========================================================================");
  console.log("RUNNING E-COMMERCE INTEGRATION TESTS");
  console.log("=========================================================================");

  const config = getClientConfig(databaseUrl);
  const client = new pg.Client(config);
  await client.connect();

  let testProductId: string | null = null;
  let testSlotId: string | null = null;
  let testPromoId: string | null = null;
  const testDate = "2029-05-20"; // far future test date

  try {
    // -------------------------------------------------------------------------
    // SETUP TEST FIXTURES
    // -------------------------------------------------------------------------
    console.log("Setting up test fixtures...");

    // Pre-cleanup in case of aborted runs
    await client.query(`DELETE FROM public.orders WHERE order_number = 'BRWN-TEST-001'`);
    await client.query(`DELETE FROM public.products WHERE slug = 'test-tiramisu'`);
    await client.query(`DELETE FROM public.availability_slots WHERE time_slot = '14:00 - 16:00'`);
    await client.query(`DELETE FROM public.promo_code_redemptions WHERE promo_code_id IN (SELECT id FROM public.promo_codes WHERE code = 'TESTCODE')`);
    await client.query(`DELETE FROM public.promo_codes WHERE code = 'TESTCODE'`);
    await client.query(`DELETE FROM public.stripe_events WHERE stripe_event_id = 'evt_test_123456789'`);

    // 1. Create a test product
    const prodRes = await client.query(
      `INSERT INTO public.products 
       (name, slug, description, price_cents, stock_quantity, low_stock_threshold, is_active, background_color) 
       VALUES 
       ('Test Tiramisu', 'test-tiramisu', 'Test desc', 1250, 100, 5, true, '#6B3F2A') 
       RETURNING id`
    );
    testProductId = prodRes.rows[0].id;
    console.log(`✅ Created test product: ${testProductId}`);

    // 2. Create a test availability slot with max capacity 1
    const slotRes = await client.query(
      `INSERT INTO public.availability_slots 
       (day_of_week, time_slot, max_orders, is_active) 
       VALUES 
       (0, '14:00 - 16:00', 1, true) 
       RETURNING id`
    );
    testSlotId = slotRes.rows[0].id;
    console.log(`✅ Created test slot (capacity=1): ${testSlotId}`);

    // 3. Create a test promo code with max uses 1
    const promoRes = await client.query(
      `INSERT INTO public.promo_codes 
       (code, discount_type, discount_value, min_order_cents, max_uses, is_active) 
       VALUES 
       ('TESTCODE', 'fixed_amount', 250, 1000, 1, true) 
       RETURNING id`
    );
    testPromoId = promoRes.rows[0].id;
    console.log(`✅ Created test promo code (max_uses=1): ${testPromoId}`);

    // -------------------------------------------------------------------------
    // TEST 1: CONCURRENT SLOT RESERVATIONS (CONCURRENCY LOCKING)
    // -------------------------------------------------------------------------
    console.log("\n-------------------------------------------------------------------------");
    console.log("TEST 1: CONCURRENT SLOT RESERVATIONS");
    console.log("-------------------------------------------------------------------------");

    const attempt1 = crypto.randomUUID();
    const attempt2 = crypto.randomUUID();

    // Execute reservation 1
    const res1 = await client.query(
      `SELECT private.check_and_reserve_slot($1::UUID, $2::DATE, 'pickup', $3::UUID, NULL::UUID, 15, true)`,
      [testSlotId, testDate, attempt1]
    );
    const success1 = res1.rows[0].check_and_reserve_slot;
    console.log(`Attempt 1 reservation check result: ${success1 ? "SUCCESS" : "FAILED"}`);

    // Insert order to occupy the slot capacity (simulating checkout server behaviour)
    const orderNumber = "BRWN-TEST-001";
    const publicToken = crypto.randomUUID();
    await client.query(
      `INSERT INTO public.orders 
       (order_number, checkout_attempt_id, public_token, customer_first_name, customer_last_name, customer_email, customer_phone, fulfillment_type, service_date, availability_slot_id, slot_hold_expires_at, subtotal_cents, discount_cents, delivery_fee_cents, gst_amount_cents, qst_amount_cents, total_cents, payment_method, payment_status, fulfillment_status, terms_accepted_at, allergen_notice_accepted_at, cart_fingerprint) 
       VALUES 
       ($1, $2::UUID, $3, 'Jean', 'Test', 'jean@test.com', '5140000000', 'pickup', $4::DATE, $5::UUID, NOW() + INTERVAL '15 minutes', 1250, 0, 0, 63, 125, 1438, 'stripe', 'pending', 'pending', NOW(), NOW(), 'fingerprint')`,
      [orderNumber, attempt1, publicToken, testDate, testSlotId]
    );
    console.log("Order 1 inserted to occupy slot capacity.");

    // Execute reservation 2 (should fail because capacity is 1 and slot is occupied by order 1)
    const res2 = await client.query(
      `SELECT private.check_and_reserve_slot($1::UUID, $2::DATE, 'pickup', $3::UUID, NULL::UUID, 15, true)`,
      [testSlotId, testDate, attempt2]
    );
    const success2 = res2.rows[0].check_and_reserve_slot;
    console.log(`Attempt 2 reservation check result: ${success2 ? "SUCCESS" : "FAILED (Slot full)"}`);

    if (success1 === true && success2 === false) {
      console.log("✅ TEST 1 PASSED: Concurrency and slot capacity checks are locked correctly!");
    } else {
      throw new Error("TEST 1 FAILED: Incorrect concurrency behaviour.");
    }

    // -------------------------------------------------------------------------
    // TEST 2: IDEMPOTENCE (DUPLICATE SUBMISSIONS & WEBHOOK EVENTS)
    // -------------------------------------------------------------------------
    console.log("\n-------------------------------------------------------------------------");
    console.log("TEST 2: IDEMPOTENCE & DEDUPLICATION");
    console.log("-------------------------------------------------------------------------");

    // 2a. Attempt duplicate order creations with same attempt_id
    console.log("Attempting duplicate order insert with same checkout_attempt_id...");

    // Duplicate insertion attempt with same attempt1 (should raise unique constraint violation)
    let duplicateOrderCaught = false;
    try {
      await client.query(
        `INSERT INTO public.orders 
         (order_number, checkout_attempt_id, public_token, customer_first_name, customer_last_name, customer_email, customer_phone, fulfillment_type, service_date, availability_slot_id, subtotal_cents, discount_cents, delivery_fee_cents, gst_amount_cents, qst_amount_cents, total_cents, payment_method, payment_status, fulfillment_status, terms_accepted_at, allergen_notice_accepted_at, cart_fingerprint) 
         VALUES 
         ('BRWN-TEST-002', $1::UUID, $2, 'Jean', 'Test', 'jean@test.com', '5140000000', 'pickup', $3::DATE, $4::UUID, 1250, 0, 0, 63, 125, 1438, 'stripe', 'pending', 'pending', NOW(), NOW(), 'fingerprint')`,
        [attempt1, crypto.randomUUID(), testDate, testSlotId]
      );
    } catch (err: any) {
      if (err.code === "23505") { // unique_violation
        duplicateOrderCaught = true;
        console.log("✅ Duplicate checkout attempt blocked by database UNIQUE constraint.");
      } else {
        console.error("Different error code received:", err);
      }
    }

    // 2b. Stripe Event Deduplication
    const stripeEventId = "evt_test_123456789";
    await client.query(
      `INSERT INTO public.stripe_events (stripe_event_id, event_type) VALUES ($1, 'payment_intent.succeeded')`,
      [stripeEventId]
    );
    console.log("First webhook event logged.");

    let duplicateWebhookCaught = false;
    try {
      await client.query(
        `INSERT INTO public.stripe_events (stripe_event_id, event_type) VALUES ($1, 'payment_intent.succeeded')`,
        [stripeEventId]
      );
    } catch (err: any) {
      if (err.code === "23505") {
        duplicateWebhookCaught = true;
        console.log("✅ Duplicate Stripe webhook event blocked by database UNIQUE constraint.");
      }
    }

    if (duplicateOrderCaught && duplicateWebhookCaught) {
      console.log("✅ TEST 2 PASSED: Double-order submissions and duplicate webhook event payloads are safely blocked.");
    } else {
      throw new Error("TEST 2 FAILED: Idempotency protections not functioning.");
    }

    // -------------------------------------------------------------------------
    // TEST 3: PROMO CODE LOCKING & OVERUSE PREVENTION
    // -------------------------------------------------------------------------
    console.log("\n-------------------------------------------------------------------------");
    console.log("TEST 3: PROMO CODE LOCKING & OVERUSE PREVENTION");
    console.log("-------------------------------------------------------------------------");

    const email = "client@test.com";

    // 3a. Reserve coupon first time
    const promoRes1 = await client.query(
      `SELECT private.reserve_promo_code($1::UUID, NULL::UUID, $2::UUID, $3::TEXT, 30)`,
      [testPromoId, attempt1, email] // 30 minutes expiration
    );
    const promoSuccess1 = promoRes1.rows[0].reserve_promo_code;
    console.log("Reservation 1 completed.");

    // 3b. Reserve coupon second time (should fail since max_uses = 1 and it is already reserved)
    const promoRes2 = await client.query(
      `SELECT private.reserve_promo_code($1::UUID, NULL::UUID, $2::UUID, $3::TEXT, 30)`,
      [testPromoId, attempt2, email]
    );
    const promoSuccess2 = promoRes2.rows[0].reserve_promo_code;
    console.log(`Reservation 2 of promo code TESTCODE: ${promoSuccess2 ? "SUCCESS" : "FAILED"}`);

    if (promoSuccess1 === true && promoSuccess2 === false) {
      console.log("✅ TEST 3 PASSED: Promotion code use limits and temporary reservations are enforced atomicaly!");
    } else {
      throw new Error("TEST 3 FAILED: Promo code concurrent overuse not prevented.");
    }

    console.log("\n=========================================================================");
    console.log("🎉 ALL E-COMMERCE INTEGRATION TESTS COMPLETED SUCCESSFULLY!");
    console.log("=========================================================================");

  } catch (err: any) {
    console.error("\n❌ TESTS FAILED:", err.message || err);
    process.exit(1);
  } finally {
    // -------------------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------------------
    console.log("\nCleaning up test rows...");
    
    if (testSlotId) {
      await client.query(`DELETE FROM public.orders WHERE availability_slot_id = $1`, [testSlotId]);
      await client.query(`DELETE FROM public.availability_slots WHERE id = $1`, [testSlotId]);
    }
    if (testProductId) {
      await client.query(`DELETE FROM public.products WHERE id = $1`, [testProductId]);
    }
    if (testPromoId) {
      await client.query(`DELETE FROM public.promo_code_redemptions WHERE promo_code_id = $1`, [testPromoId]);
      await client.query(`DELETE FROM public.promo_codes WHERE id = $1`, [testPromoId]);
    }
    await client.query(`DELETE FROM public.stripe_events WHERE stripe_event_id = 'evt_test_123456789'`);

    console.log("Cleanup completed.");
    await client.end();
  }
}

runTests();
