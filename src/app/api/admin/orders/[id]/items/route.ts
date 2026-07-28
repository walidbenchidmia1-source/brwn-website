import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function GET(
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
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Interdit. Rôle admin requis." }, { status: 403 });
    }

    const adminClient = createAdminClient();

    // 2. Fetch order items
    const { data: items, error: itemsErr } = await adminClient
      .from("order_items")
      .select("*")
      .eq("order_id", orderId);

    if (itemsErr) {
      console.error("Order items fetch failed:", itemsErr);
      return NextResponse.json({ error: "Échec de récupération." }, { status: 500 });
    }

    return NextResponse.json({ items: items || [] });
  } catch (err: any) {
    console.error("Items route failed:", err);
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}
