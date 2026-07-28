import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function GET() {
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
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Interdit. Rôle admin requis." }, { status: 403 });
    }

    const adminClient = createAdminClient();

    // 2. Fetch all audit logs
    const { data: logs, error: logsErr } = await adminClient
      .from("admin_audit_logs")
      .select("*")
      .order("created_at", { ascending: false });

    if (logsErr) {
      console.error("Audit logs fetch failed:", logsErr);
      return NextResponse.json({ error: "Échec de récupération." }, { status: 500 });
    }

    return NextResponse.json({ logs: logs || [] });
  } catch (err: any) {
    console.error("Logs route failed:", err);
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}
