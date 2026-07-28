import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function POST(req: Request) {
  try {
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

    const body = await req.json();
    const { action, payload } = body;

    const adminClient = createAdminClient();
    const now = new Date().toISOString();
    const adminName = profile.full_name || "Admin";

    switch (action) {
      case "update_global": {
        // Save store settings
        const { error } = await adminClient
          .from("store_settings")
          .upsert({
            id: "global",
            pickup_address: payload.pickup_address,
            pickup_instructions: payload.pickup_instructions,
            preparation_delay_hours: parseInt(payload.preparation_delay_hours),
            min_order_cents: Math.round(parseFloat(payload.min_order_cents) * 100),
            free_delivery_min_cents: Math.round(parseFloat(payload.free_delivery_min_cents) * 100),
            tax_rate_gst: parseFloat(payload.tax_rate_gst),
            tax_rate_qst: parseFloat(payload.tax_rate_qst),
            stripe_enabled: !!payload.stripe_enabled,
            cod_enabled: !!payload.cod_enabled,
            cop_enabled: !!payload.cop_enabled,
            updated_at: now,
          });

        if (error) {
          console.error("Failed to update store settings:", error);
          return NextResponse.json({ error: "Échec de sauvegarde." }, { status: 500 });
        }

        // Log audit
        await adminClient.from("admin_audit_logs").insert({
          action_type: "settings_update_global",
          modified_by: user.id,
          note: `Configurations de la boutique mises à jour par ${adminName} (Taxes, minimums de commande, adresses).`,
        });

        break;
      }

      case "save_zone": {
        const zoneData = {
          name: payload.name,
          postal_code_prefixes: payload.postal_code_prefixes.split(",").map((p: string) => p.trim().toUpperCase()),
          delivery_fee_cents: Math.round(parseFloat(payload.delivery_fee_cents) * 100),
          min_order_cents: Math.round(parseFloat(payload.min_order_cents) * 100),
          is_active: payload.is_active !== false,
        };

        let err;
        if (payload.id) {
          const { error } = await adminClient
            .from("delivery_zones")
            .update(zoneData)
            .eq("id", payload.id);
          err = error;
        } else {
          const { error } = await adminClient
            .from("delivery_zones")
            .insert(zoneData);
          err = error;
        }

        if (err) {
          console.error("Save zone failed:", err);
          return NextResponse.json({ error: "Échec d'enregistrement de la zone." }, { status: 500 });
        }

        await adminClient.from("admin_audit_logs").insert({
          action_type: "settings_save_zone",
          modified_by: user.id,
          note: `Zone de livraison "${payload.name}" enregistrée/modifiée par ${adminName}.`,
        });

        break;
      }

      case "delete_zone": {
        const { error } = await adminClient
          .from("delivery_zones")
          .delete()
          .eq("id", payload.id);

        if (error) {
          return NextResponse.json({ error: "Échec de suppression." }, { status: 500 });
        }

        await adminClient.from("admin_audit_logs").insert({
          action_type: "settings_delete_zone",
          modified_by: user.id,
          note: `Zone de livraison supprimée par ${adminName} (ID: ${payload.id}).`,
        });

        break;
      }

      case "save_slot": {
        const slotData = {
          day_of_week: parseInt(payload.day_of_week),
          time_slot: payload.time_slot,
          max_orders: parseInt(payload.max_orders),
          is_active: payload.is_active !== false,
        };

        let err;
        if (payload.id) {
          const { error } = await adminClient
            .from("availability_slots")
            .update(slotData)
            .eq("id", payload.id);
          err = error;
        } else {
          const { error } = await adminClient
            .from("availability_slots")
            .insert(slotData);
          err = error;
        }

        if (err) {
          return NextResponse.json({ error: "Échec d'enregistrement du créneau." }, { status: 500 });
        }

        await adminClient.from("admin_audit_logs").insert({
          action_type: "settings_save_slot",
          modified_by: user.id,
          note: `Créneau de service "${payload.time_slot}" enregistré/modifié par ${adminName} pour le jour ${payload.day_of_week}.`,
        });

        break;
      }

      case "delete_slot": {
        const { error } = await adminClient
          .from("availability_slots")
          .delete()
          .eq("id", payload.id);

        if (error) {
          return NextResponse.json({ error: "Échec de suppression." }, { status: 500 });
        }

        await adminClient.from("admin_audit_logs").insert({
          action_type: "settings_delete_slot",
          modified_by: user.id,
          note: `Créneau de service supprimé par ${adminName} (ID: ${payload.id}).`,
        });

        break;
      }

      case "save_closed_date": {
        const closedData = {
          closed_date: payload.closed_date,
          reason: payload.reason || "",
        };

        let err;
        if (payload.id) {
          const { error } = await adminClient
            .from("closed_dates")
            .update(closedData)
            .eq("id", payload.id);
          err = error;
        } else {
          const { error } = await adminClient
            .from("closed_dates")
            .insert(closedData);
          err = error;
        }

        if (err) {
          return NextResponse.json({ error: "Échec d'enregistrement de la date de fermeture." }, { status: 500 });
        }

        await adminClient.from("admin_audit_logs").insert({
          action_type: "settings_save_closed_date",
          modified_by: user.id,
          note: `Date de fermeture "${payload.closed_date}" enregistrée/modifiée par ${adminName}. Raison: ${payload.reason || "Non spécifiée"}.`,
        });

        break;
      }

      case "delete_closed_date": {
        const { error } = await adminClient
          .from("closed_dates")
          .delete()
          .eq("id", payload.id);

        if (error) {
          return NextResponse.json({ error: "Échec de suppression." }, { status: 500 });
        }

        await adminClient.from("admin_audit_logs").insert({
          action_type: "settings_delete_closed_date",
          modified_by: user.id,
          note: `Date de fermeture supprimée par ${adminName} (ID: ${payload.id}).`,
        });

        break;
      }

      case "save_promo": {
        const promoData = {
          code: payload.code.trim().toUpperCase(),
          discount_type: payload.discount_type,
          discount_value: payload.discount_type === "percentage" ? parseInt(payload.discount_value) : Math.round(parseFloat(payload.discount_value) * 100),
          min_order_cents: Math.round(parseFloat(payload.min_order_cents || "0") * 100),
          max_discount_cents: payload.max_discount_cents ? Math.round(parseFloat(payload.max_discount_cents) * 100) : null,
          max_uses: payload.max_uses ? parseInt(payload.max_uses) : null,
          is_active: payload.is_active !== false,
          start_date: payload.start_date || null,
          end_date: payload.end_date || null,
        };

        let err;
        if (payload.id) {
          const { error } = await adminClient
            .from("promo_codes")
            .update(promoData)
            .eq("id", payload.id);
          err = error;
        } else {
          const { error } = await adminClient
            .from("promo_codes")
            .insert(promoData);
          err = error;
        }

        if (err) {
          console.error("Save promo failed:", err);
          return NextResponse.json({ error: "Échec d'enregistrement du code promo. Vérifiez qu'il n'existe pas déjà." }, { status: 500 });
        }

        await adminClient.from("admin_audit_logs").insert({
          action_type: "settings_save_promo",
          modified_by: user.id,
          note: `Code promotionnel "${payload.code}" enregistré/modifié par ${adminName}.`,
        });

        break;
      }

      case "delete_promo": {
        const { error } = await adminClient
          .from("promo_codes")
          .delete()
          .eq("id", payload.id);

        if (error) {
          return NextResponse.json({ error: "Échec de suppression." }, { status: 500 });
        }

        await adminClient.from("admin_audit_logs").insert({
          action_type: "settings_delete_promo",
          modified_by: user.id,
          note: `Code promotionnel supprimé par ${adminName} (ID: ${payload.id}).`,
        });

        break;
      }

      default:
        return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Settings route failed:", err);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
