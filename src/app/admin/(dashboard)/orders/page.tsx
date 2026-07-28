import React from "react";
import OrdersDashboard from "./OrdersDashboard";
import { createAdminClient } from "@/utils/supabase/admin";

export const revalidate = 0; // Disable caching

export default async function AdminOrdersPage() {
  const supabase = createAdminClient();

  // Fetch initial orders
  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  // Fetch initial audit logs
  const { data: logs } = await supabase
    .from("admin_audit_logs")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="bg-[#FAF7F2] min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#C4A484]">
            Gestion E-Commerce
          </span>
          <h1 className="text-2xl font-black uppercase text-[#3D2216]">
            Commandes Clients
          </h1>
        </div>
      </div>
      <OrdersDashboard initialOrders={orders || []} initialLogs={logs || []} />
    </div>
  );
}
