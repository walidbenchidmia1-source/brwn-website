import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Load environment variables manually from .env.local
const envPath = path.join(__dirname, "../.env.local");
const envContent = fs.readFileSync(envPath, "utf8");
const env: Record<string, string> = {};

envContent.split("\n").forEach((line) => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || "";
    if (value.startsWith('"') && value.endsWith('"')) value = value.substring(1, value.length - 1);
    else if (value.startsWith("'") && value.endsWith("'")) value = value.substring(1, value.length - 1);
    env[key] = value.trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedData() {
  console.log("--- Seeding Store Settings and Delivery Zones ---");

  // 1. Insert Global Store Settings if missing
  const { data: existingSettings } = await supabase
    .from("store_settings")
    .select("id")
    .eq("id", "global")
    .maybeSingle();

  if (!existingSettings) {
    const { error: settingsError } = await supabase.from("store_settings").insert({
      id: "global",
      pickup_address: "123 Rue de Tiramisu, Montréal, QC",
      pickup_instructions: "Veuillez vous présenter au comptoir avec votre numéro de commande.",
      preparation_delay_hours: 24,
      min_order_cents: 1500,
      free_delivery_min_cents: 5000,
      tax_rate_gst: 0.05,
      tax_rate_qst: 0.09975,
      stripe_enabled: false,
      cod_enabled: true,
      cop_enabled: true,
    });

    if (settingsError) {
      console.error("Error inserting store_settings:", settingsError);
    } else {
      console.log("✅ Store settings inserted!");
    }
  } else {
    console.log("Store settings already exist.");
  }

  // 2. Insert Montreal Delivery Zones
  const mtlPrefixes = [
    "H1A","H1B","H1C","H1E","H1G","H1H","H1J","H1K","H1L","H1M","H1N","H1P","H1R","H1S","H1T","H1V","H1W","H1X","H1Y","H1Z",
    "H2A","H2B","H2C","H2E","H2G","H2H","H2J","H2K","H2L","H2M","H2N","H2P","H2R","H2S","H2T","H2V","H2W","H2X","H2Y","H2Z",
    "H3A","H3B","H3C","H3E","H3G","H3H","H3J","H3K","H3L","H3M","H3N","H3P","H3R","H3S","H3T","H3V","H3W","H3X","H3Y","H3Z",
    "H4A","H4B","H4C","H4E","H4G","H4H","H4J","H4K","H4L","H4M","H4N","H4P","H4R","H4S","H4T","H4V","H4W","H4X","H4Y","H4Z",
    "H8N","H8P","H8R","H8S","H8T","H8Z","H9A","H9B","H9C","H9E","H9H","H9J","H9P","H9R","H9S","H9W"
  ];

  const { data: existingZones } = await supabase.from("delivery_zones").select("id");

  if (!existingZones || existingZones.length === 0) {
    const { error: zoneError } = await supabase.from("delivery_zones").insert([
      {
        name: "Grand Montréal",
        postal_code_prefixes: mtlPrefixes,
        delivery_fee_cents: 500, // 5.00$ CAD
        min_order_cents: 1500,  // 15.00$ CAD
        is_active: true,
      },
    ]);

    if (zoneError) {
      console.error("Error inserting delivery zone:", zoneError);
    } else {
      console.log("✅ Montreal delivery zone inserted successfully!");
    }
  } else {
    console.log("Delivery zones already present.");
  }

  // 3. Insert Default Availability Slots for all days (0 to 6)
  const { data: existingSlots } = await supabase.from("availability_slots").select("id");
  if (!existingSlots || existingSlots.length === 0) {
    const slotsToInsert = [];
    const timeSlots = ["10:00 - 13:00", "13:00 - 16:00", "16:00 - 19:00"];
    for (let day = 0; day <= 6; day++) {
      for (const timeSlot of timeSlots) {
        slotsToInsert.push({
          day_of_week: day,
          time_slot: timeSlot,
          max_orders: 15,
          is_active: true,
        });
      }
    }
    const { error: slotsError } = await supabase.from("availability_slots").insert(slotsToInsert);
    if (slotsError) {
      console.error("Error inserting default availability slots:", slotsError);
    } else {
      console.log("✅ Default availability slots inserted!");
    }
  } else {
    console.log("Availability slots already present.");
  }
}

seedData();
