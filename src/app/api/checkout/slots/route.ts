import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date");

    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return NextResponse.json({ error: "Date invalide. Format attendu : YYYY-MM-DD" }, { status: 400 });
    }

    const date = new Date(dateStr + "T00:00:00");
    const dayOfWeek = date.getDay(); // 0 is Sunday, 6 is Saturday

    const supabase = createAdminClient();

    // Check if the date is closed
    const { data: isClosed } = await supabase
      .from("closed_dates")
      .select("id")
      .eq("closed_date", dateStr)
      .maybeSingle();

    if (isClosed) {
      return NextResponse.json({ slots: [], isClosed: true });
    }

    // Get active slots for this day of week
    const { data: slots, error: slotsErr } = await supabase
      .from("availability_slots")
      .select("id, day_of_week, time_slot, max_orders")
      .eq("day_of_week", dayOfWeek)
      .eq("is_active", true)
      .order("time_slot", { ascending: true });

    if (slotsErr) {
      console.error("Slots fetch error:", slotsErr);
      return NextResponse.json({ error: "Erreur lors de la récupération des créneaux." }, { status: 500 });
    }

    if (!slots || slots.length === 0) {
      return NextResponse.json({ slots: [], isClosed: false });
    }

    // Query active counts for these slots on the selected date
    const slotIds = slots.map((s) => s.id);
    const { data: orders, error: ordersErr } = await supabase
      .from("orders")
      .select("availability_slot_id, slot_hold_expires_at")
      .eq("service_date", dateStr)
      .in("availability_slot_id", slotIds)
      .neq("fulfillment_status", "cancelled");

    if (ordersErr) {
      console.error("Orders fetch error for slots:", ordersErr);
      return NextResponse.json({ error: "Erreur de calcul de capacité." }, { status: 500 });
    }

    // Count orders per slot
    const countsMap = new Map<string, number>();
    for (const o of orders || []) {
      // Exclude expired slot holds
      const isExpired = o.slot_hold_expires_at && new Date(o.slot_hold_expires_at) < new Date();
      if (!isExpired) {
        countsMap.set(o.availability_slot_id, (countsMap.get(o.availability_slot_id) || 0) + 1);
      }
    }

    const slotsWithCapacity = slots.map((slot) => {
      const activeCount = countsMap.get(slot.id) || 0;
      const remaining = Math.max(0, slot.max_orders - activeCount);
      return {
        id: slot.id,
        time_slot: slot.time_slot,
        max_orders: slot.max_orders,
        active_orders_count: activeCount,
        remaining_capacity: remaining,
        is_available: remaining > 0,
      };
    });

    return NextResponse.json({ slots: slotsWithCapacity, isClosed: false });
  } catch (err: any) {
    console.error("Failed to fetch slots capacity:", err);
    return NextResponse.json({ error: "Une erreur interne est survenue." }, { status: 500 });
  }
}
