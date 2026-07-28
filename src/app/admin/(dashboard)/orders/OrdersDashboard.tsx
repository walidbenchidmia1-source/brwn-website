"use client";

import React, { useState, useEffect } from "react";
import { Search, ShoppingBag, Truck, Store, CreditCard, CheckCircle, Clock, Ban, DollarSign, Download, Printer, RefreshCcw, FileText, Mail, Send, X } from "lucide-react";
import Image from "next/image";

interface Order {
  id: string;
  order_number: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_email: string;
  customer_phone: string;
  fulfillment_type: "delivery" | "pickup";
  delivery_address: string;
  delivery_apartment: string;
  delivery_city: string;
  delivery_province: string;
  delivery_postal_code: string;
  delivery_instructions: string;
  order_notes: string;
  service_date: string;
  availability_slot_id: string;
  subtotal_cents: number;
  discount_cents: number;
  delivery_fee_cents: number;
  gst_amount_cents: number;
  qst_amount_cents: number;
  total_cents: number;
  refunded_amount_cents: number;
  payment_method: "stripe" | "on_delivery" | "on_pickup";
  payment_status: "pending" | "requires_action" | "paid" | "failed" | "cancelled" | "partially_refunded" | "refunded" | "cash_on_delivery" | "pay_on_pickup" | "test";
  fulfillment_status: "pending" | "confirmed" | "in_preparation" | "ready" | "out_for_delivery" | "completed" | "cancelled";
  created_at: string;
  stripe_payment_intent_id?: string;
  public_token: string;
}

interface AuditLog {
  id: string;
  order_id: string;
  action_type: string;
  previous_status: string;
  new_status: string;
  amount_cents?: number;
  modified_by?: string;
  note?: string;
  created_at: string;
}

interface Props {
  initialOrders: Order[];
  initialLogs: AuditLog[];
}

export default function OrdersDashboard({ initialOrders, initialLogs }: Props) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [logs, setLogs] = useState<AuditLog[]>(initialLogs);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [activeItems, setActiveItems] = useState<any[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [fulfillmentFilter, setFulfillmentFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Refund panel states
  const [refundAmount, setRefundAmount] = useState("");
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);
  const [refundError, setRefundError] = useState("");

  // Status transition states
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [adminNote, setAdminNote] = useState("");

  // Test email modal states
  const [isTestEmailOpen, setIsTestEmailOpen] = useState(false);
  const [testRecipient, setTestRecipient] = useState("brwndesserts@gmail.com");
  const [testFirstName, setTestFirstName] = useState("Jean");
  const [testOrderNo, setTestOrderNo] = useState("TEST-1001");
  const [testFulfillment, setTestFulfillment] = useState("pickup");
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSendTestEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSendingTestEmail) return;

    setIsSendingTestEmail(true);
    setTestEmailResult(null);

    try {
      const res = await fetch("/api/admin/send-test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientEmail: testRecipient,
          customerFirstName: testFirstName,
          orderNumber: testOrderNo,
          fulfillmentType: testFulfillment,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestEmailResult({
          success: true,
          message: data.message || "E-mail envoyé avec succès !",
        });
      } else {
        setTestEmailResult({
          success: false,
          message: data.error || "Échec de l'envoi de l'e-mail de test.",
        });
      }
    } catch (err: any) {
      setTestEmailResult({
        success: false,
        message: err.message || "Erreur de communication.",
      });
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  // Format pricing
  const formatPrice = (cents: number) => {
    return (cents / 100).toFixed(2) + " $ CAD";
  };

  // Load items when order is selected
  useEffect(() => {
    if (!activeOrder) {
      setActiveItems([]);
      return;
    }
    const fetchItems = async () => {
      setIsLoadingItems(true);
      try {
        const res = await fetch(`/api/admin/orders/${activeOrder.id}/items`);
        // Wait, did we create this route? Not yet! Let's create `/api/admin/orders/[id]/items/route.ts` next.
        if (res.ok) {
          const data = await res.json();
          setActiveItems(data.items || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingItems(false);
      }
    };
    fetchItems();
  }, [activeOrder]);

  // Handle order status update
  const handleUpdateStatus = async (fStatus: string | null, pStatus: string | null) => {
    if (!activeOrder || isUpdatingStatus) return;
    setIsUpdatingStatus(true);
    setStatusError("");

    try {
      const res = await fetch(`/api/admin/orders/${activeOrder.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fulfillmentStatus: fStatus,
          paymentStatus: pStatus,
          note: adminNote,
        }),
      });

      if (res.ok) {
        // Refresh orders list local state
        const updatedOrders = orders.map((o) => {
          if (o.id === activeOrder.id) {
            const updated = { ...o };
            if (fStatus) updated.fulfillment_status = fStatus as any;
            if (pStatus) updated.payment_status = pStatus as any;
            return updated;
          }
          return o;
        });
        setOrders(updatedOrders);
        
        // Update currently selected activeOrder details
        const updatedSel = updatedOrders.find((o) => o.id === activeOrder.id)!;
        setActiveOrder(updatedSel);

        // Fetch fresh audit logs
        const logsRes = await fetch("/api/admin/logs"); // let's create `/api/admin/logs/route.ts` next
        if (logsRes.ok) {
          const logsData = await logsRes.json();
          setLogs(logsData.logs || []);
        }

        setAdminNote("");
      } else {
        const data = await res.json();
        setStatusError(data.error || "Échec de la mise à jour.");
      }
    } catch (err) {
      setStatusError("Erreur lors de la mise à jour du statut.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handle Stripe / manual refund
  const handleRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder || isProcessingRefund) return;

    setIsProcessingRefund(true);
    setRefundError("");

    const parsedCents = refundAmount ? Math.round(parseFloat(refundAmount) * 100) : null;
    const maxRefundable = activeOrder.total_cents - activeOrder.refunded_amount_cents;

    if (parsedCents !== null && (parsedCents <= 0 || parsedCents > maxRefundable)) {
      setRefundError("Le montant saisi est invalide ou supérieur au solde remboursable.");
      setIsProcessingRefund(false);
      return;
    }

    try {
      const res = await fetch(`/api/admin/orders/${activeOrder.id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountCents: parsedCents }),
      });

      const data = await res.json();
      if (res.ok) {
        // Update order status locally
        const updatedOrders = orders.map((o) => {
          if (o.id === activeOrder.id) {
            return {
              ...o,
              payment_status: data.newPaymentStatus,
              refunded_amount_cents: data.totalRefundedCents,
            };
          }
          return o;
        });
        setOrders(updatedOrders);
        setActiveOrder(updatedOrders.find((o) => o.id === activeOrder.id)!);
        setRefundAmount("");

        // Refresh audit logs
        const logsRes = await fetch("/api/admin/logs");
        if (logsRes.ok) {
          const logsData = await logsRes.json();
          setLogs(logsData.logs || []);
        }
      } else {
        setRefundError(data.error || "Échec du remboursement.");
      }
    } catch (err) {
      setRefundError("Erreur de communication avec le serveur.");
    } finally {
      setIsProcessingRefund(false);
    }
  };

  // Filter orders
  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.order_number.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_first_name.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_last_name.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_email.toLowerCase().includes(search.toLowerCase());

    const matchesFulfillment = fulfillmentFilter === "all" || o.fulfillment_status === fulfillmentFilter;
    const matchesPayment = paymentFilter === "all" || o.payment_status === paymentFilter;
    const matchesType = typeFilter === "all" || o.fulfillment_type === typeFilter;

    return matchesSearch && matchesFulfillment && matchesPayment && matchesType;
  });

  // Export orders to CSV
  const handleExportCSV = () => {
    const headers = [
      "Numéro de commande",
      "Nom",
      "Prénom",
      "Email",
      "Téléphone",
      "Type de retrait",
      "Adresse",
      "Date de service",
      "Sous-total (CAD)",
      "Réduction (CAD)",
      "Livraison (CAD)",
      "Taxes (CAD)",
      "Total (CAD)",
      "Remboursé (CAD)",
      "Méthode de paiement",
      "Statut paiement",
      "Statut préparation",
      "Date de création",
    ];

    const rows = filteredOrders.map((o) => {
      const fullAddress = o.fulfillment_type === "delivery"
        ? `"${o.delivery_address || ""}, ${o.delivery_apartment || ""} - ${o.delivery_postal_code || ""}"`
        : "Ramassage Boutique";
      
      const totalTaxes = ((o.gst_amount_cents + o.qst_amount_cents) / 100).toFixed(2);

      return [
        o.order_number,
        o.customer_last_name,
        o.customer_first_name,
        o.customer_email,
        o.customer_phone,
        o.fulfillment_type,
        fullAddress,
        o.service_date,
        (o.subtotal_cents / 100).toFixed(2),
        (o.discount_cents / 100).toFixed(2),
        (o.delivery_fee_cents / 100).toFixed(2),
        totalTaxes,
        (o.total_cents / 100).toFixed(2),
        (o.refunded_amount_cents / 100).toFixed(2),
        o.payment_method,
        o.payment_status,
        o.fulfillment_status,
        o.created_at,
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `BRWN_Commandes_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Receipt handler
  const handlePrintReceipt = () => {
    if (!activeOrder) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const itemsRows = activeItems
      .map(
        (i) => `
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee;">
          <b>${i.flavor}</b><br>
          <span style="font-size: 10px; color: #888;">${i.format}</span>
        </td>
        <td style="text-align: center;">${i.quantity}</td>
        <td style="text-align: right;">${formatPrice(i.line_total_cents)}</td>
      </tr>
    `
      )
      .join("");

    printWindow.document.write(`
      <html>
      <head>
        <title>Ticket Commande - ${activeOrder.order_number}</title>
        <style>
          body { font-family: monospace; padding: 20px; max-width: 300px; margin: 0 auto; color: #000; }
          .header { text-align: center; margin-bottom: 20px; }
          .divider { border-top: 1px dashed #000; margin: 10px 0; }
          .row { display: flex; justify-content: space-between; font-size: 12px; margin: 4px 0; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h3>BRWN MONTREAL</h3>
          <p>TIRAMISU MAISON</p>
          <h2>${activeOrder.order_number}</h2>
          <p>${new Date(activeOrder.created_at).toLocaleString("fr-CA")}</p>
        </div>
        <div class="divider"></div>
        <div class="row"><span>Client:</span><span>${activeOrder.customer_first_name} ${activeOrder.customer_last_name}</span></div>
        <div class="row"><span>Tél:</span><span>${activeOrder.customer_phone}</span></div>
        <div class="row"><span>Mode:</span><span>${activeOrder.fulfillment_type === "delivery" ? "Livraison" : "Ramassage"}</span></div>
        <div class="row"><span>Date:</span><span>${activeOrder.service_date}</span></div>
        <div class="divider"></div>
        <table>
          <thead>
            <tr>
              <th style="text-align: left;">Article</th>
              <th>Qté</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>
        <div class="divider"></div>
        <div class="row"><span>Sous-total:</span><span>${formatPrice(activeOrder.subtotal_cents)}</span></div>
        ${activeOrder.discount_cents > 0 ? `<div class="row"><span>Code Promo:</span><span>-${formatPrice(activeOrder.discount_cents)}</span></div>` : ""}
        <div class="row"><span>Livraison:</span><span>${formatPrice(activeOrder.delivery_fee_cents)}</span></div>
        <div class="row"><span>Taxes:</span><span>${formatPrice(activeOrder.gst_amount_cents + activeOrder.qst_amount_cents)}</span></div>
        <div class="row" style="font-weight: bold; font-size: 14px;"><span>TOTAL:</span><span>${formatPrice(activeOrder.total_cents)}</span></div>
        <div class="divider"></div>
        <p style="text-align: center; font-size: 10px; margin-top: 20px;">Merci pour votre gourmandise !</p>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="flex flex-col gap-6 select-none font-sans text-[#3D2216]">
      {/* Filtering Header Toolbar */}
      <div className="bg-white rounded-3xl p-6 border border-[#3D2216]/5 shadow-xs flex flex-wrap gap-4 items-center justify-between">
        
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-4 top-3.5 w-4 h-4 text-[#3D2216]/40" />
          <input
            type="text"
            placeholder="Rechercher par n° de commande, client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#FAF7F2] border border-[#3D2216]/10 focus:border-[#C4A484] rounded-xl py-3 pl-11 pr-4 text-xs outline-hidden"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-[#FAF7F2] border border-[#3D2216]/10 rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-wider outline-hidden"
          >
            <option value="all">Tous les retraits</option>
            <option value="delivery">Livraison</option>
            <option value="pickup">Ramassage</option>
          </select>
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="bg-[#FAF7F2] border border-[#3D2216]/10 rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-wider outline-hidden"
          >
            <option value="all">Tous les paiements</option>
            <option value="paid">Payé</option>
            <option value="pending">En attente</option>
            <option value="refunded">Remboursé</option>
          </select>
          
          <button
            onClick={() => {
              setTestEmailResult(null);
              setIsTestEmailOpen(true);
            }}
            className="px-4 py-3 bg-[#3D2216] hover:bg-[#150B07] text-[#F9F6F0] rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-colors shadow-xs"
          >
            <Mail className="w-4 h-4 text-[#C4A484]" />
            Envoyer un e-mail de test
          </button>

          <button
            onClick={handleExportCSV}
            className="px-4 py-3 bg-[#EADDC9]/40 hover:bg-[#EADDC9]/60 border border-[#3D2216]/10 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Download className="w-4 h-4" />
            Exporter CSV
          </button>
        </div>
      </div>

      {/* Tabs of statuses */}
      <div className="flex flex-wrap gap-2 mb-2 border-b border-[#3D2216]/10 pb-4">
        {[
          { key: "all", label: "Toutes les étapes" },
          { key: "pending", label: "À valider" },
          { key: "confirmed", label: "Confirmées" },
          { key: "in_preparation", label: "Préparation" },
          { key: "ready", label: "Prêtes / Livrées" },
          { key: "cancelled", label: "Annulées" }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFulfillmentFilter(tab.key)}
            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider cursor-pointer transition-all ${
              fulfillmentFilter === tab.key
                ? "bg-[#3D2216] text-[#F9F6F0] shadow-sm"
                : "bg-white text-[#3D2216]/75 hover:bg-[#3D2216]/5 border border-[#3D2216]/10"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-3xl border border-[#3D2216]/5 shadow-xs overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#3D2216]/10 text-[#3D2216]/50 uppercase tracking-widest text-[9px] font-black">
              <th className="py-4 px-6">Commande</th>
              <th className="py-4 px-4">Client</th>
              <th className="py-4 px-4">Mode</th>
              <th className="py-4 px-4">Retrait demandé</th>
              <th className="py-4 px-4 text-right">Total</th>
              <th className="py-4 px-4">Paiement</th>
              <th className="py-4 px-6">État</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#3D2216]/5 text-xs">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-[#3D2216]/50 uppercase tracking-wider font-bold">
                  Aucune commande trouvée.
                </td>
              </tr>
            ) : (
              filteredOrders.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => setActiveOrder(o)}
                  className="hover:bg-[#FAF7F2] cursor-pointer transition-colors"
                >
                  <td className="py-4 px-6 font-bold text-[#3D2216]">
                    {o.order_number}
                  </td>
                  <td className="py-4 px-4">
                    <span className="font-bold block">{o.customer_first_name} {o.customer_last_name}</span>
                    <span className="text-[10px] text-[#3D2216]/60">{o.customer_email}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="flex items-center gap-1.5 font-medium">
                      {o.fulfillment_type === "delivery" ? (
                        <>
                          <Truck className="w-3.5 h-3.5 text-[#C4A484]" />
                          Livraison
                        </>
                      ) : (
                        <>
                          <Store className="w-3.5 h-3.5 text-[#C4A484]" />
                          Ramassage
                        </>
                      )}
                    </span>
                  </td>
                  <td className="py-4 px-4 font-medium">
                    {o.service_date}
                  </td>
                  <td className="py-4 px-4 text-right font-black text-[#3D2216]">
                    {formatPrice(o.total_cents)}
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                      o.payment_status === "paid"
                        ? "bg-green-500/10 border-green-500/20 text-green-700"
                        : o.payment_status.includes("refund")
                        ? "bg-amber-500/10 border-amber-500/20 text-amber-700"
                        : "bg-red-500/10 border-red-500/20 text-red-600"
                    }`}>
                      {o.payment_status}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                      o.fulfillment_status === "completed"
                        ? "bg-green-700 text-white"
                        : o.fulfillment_status === "cancelled"
                        ? "bg-gray-100 text-gray-500"
                        : "bg-[#EADDC9] text-[#3D2216]"
                    }`}>
                      {o.fulfillment_status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Details Side Modal Overlay */}
      {activeOrder && (
        <div className="fixed inset-0 z-50 overflow-hidden flex pl-10">
          <div className="absolute inset-0 bg-[#150B07]/40 backdrop-blur-xs transition-opacity" onClick={() => setActiveOrder(null)} />
          
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-2xl bg-[#F9F6F0] flex flex-col border-l border-[#3D2216]/10 relative shadow-2xl">
              
              {/* Header */}
              <div className="p-6 border-b border-[#3D2216]/10 bg-white flex justify-between items-center select-none">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#C4A484]">
                    Fiche Commande
                  </span>
                  <h2 className="text-lg font-black uppercase text-[#3D2216]">
                    {activeOrder.order_number}
                  </h2>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={handlePrintReceipt}
                    className="p-2 border border-[#3D2216]/10 rounded-xl hover:bg-[#3D2216]/5 text-[#3D2216] cursor-pointer"
                    title="Imprimer le ticket de préparation"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setActiveOrder(null)}
                    className="px-4 py-2 border border-[#3D2216]/10 rounded-xl hover:bg-[#3D2216]/5 text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Fermer
                  </button>
                </div>
              </div>

              {/* Scrollable details panel */}
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                
                {/* 1. Status transition selectors */}
                <div className="bg-white rounded-2xl p-4 border border-[#3D2216]/5 flex flex-col gap-3 shadow-xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#3D2216]/40">Changements d'états</span>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-bold uppercase text-[#3D2216]/70">Préparation</label>
                      <select
                        value={activeOrder.fulfillment_status}
                        onChange={(e) => handleUpdateStatus(e.target.value, null)}
                        disabled={isUpdatingStatus}
                        className="bg-[#FAF7F2] border border-[#3D2216]/10 rounded-xl py-2 px-3 text-xs outline-hidden"
                      >
                        <option value="pending">En attente de validation</option>
                        <option value="confirmed">Confirmée</option>
                        <option value="in_preparation">En préparation</option>
                        <option value="ready">Prête</option>
                        <option value="out_for_delivery">En cours de livraison</option>
                        <option value="completed">Complétée</option>
                        <option value="cancelled">Annuler la commande</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-bold uppercase text-[#3D2216]/70">Paiement</label>
                      <select
                        value={activeOrder.payment_status}
                        onChange={(e) => handleUpdateStatus(null, e.target.value)}
                        disabled={isUpdatingStatus}
                        className="bg-[#FAF7F2] border border-[#3D2216]/10 rounded-xl py-2 px-3 text-xs outline-hidden"
                      >
                        <option value="pending">En attente</option>
                        <option value="paid">Payé</option>
                        <option value="failed">Échec</option>
                        <option value="cancelled">Annulé</option>
                        <option value="cash_on_delivery">À la livraison</option>
                        <option value="pay_on_pickup">À la cueillette</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* Note box */}
                  <div className="flex flex-col gap-1.5 mt-2">
                    <input
                      type="text"
                      placeholder="Note explicative pour l'historique d'audit (ex: Encaissé par chèque...)"
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      className="w-full bg-[#FAF7F2] border border-[#3D2216]/10 focus:border-[#C4A484] rounded-xl py-2 px-3 text-xs outline-hidden"
                    />
                  </div>

                  {statusError && <span className="text-[10px] font-bold text-red-600">{statusError}</span>}
                </div>

                {/* 2. Stripe / Offline Refund panel */}
                {activeOrder.payment_status !== "cancelled" && (
                  <form onSubmit={handleRefund} className="bg-white rounded-2xl p-4 border border-[#3D2216]/5 flex flex-col gap-3 shadow-xs">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#3D2216]/40">Remboursement</span>
                    <div className="flex justify-between items-center text-xs text-[#3D2216]">
                      <span>Montant payé : <strong>{formatPrice(activeOrder.total_cents)}</strong></span>
                      <span>Déjà remboursé : <strong className="text-red-600">{formatPrice(activeOrder.refunded_amount_cents)}</strong></span>
                    </div>

                    <div className="flex gap-2 items-center">
                      <div className="relative flex-1">
                        <span className="absolute left-3.5 top-2.5 text-xs text-[#3D2216]/40">$</span>
                        <input
                          type="number"
                          step="0.01"
                          placeholder={`Max: ${((activeOrder.total_cents - activeOrder.refunded_amount_cents) / 100).toFixed(2)}`}
                          value={refundAmount}
                          onChange={(e) => setRefundAmount(e.target.value)}
                          className="w-full bg-[#FAF7F2] border border-[#3D2216]/10 rounded-xl py-2 pl-7 pr-3 text-xs outline-hidden"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isProcessingRefund}
                        className="bg-[#C83E4D] hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl cursor-pointer disabled:opacity-40"
                      >
                        {isProcessingRefund ? "En cours..." : "Rembourser"}
                      </button>
                    </div>

                    {refundError && <span className="text-[10px] font-bold text-red-600">{refundError}</span>}
                  </form>
                )}

                {/* 3. Items ordered list */}
                <div className="bg-white rounded-2xl p-5 border border-[#3D2216]/5 shadow-xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#3D2216]/40 block mb-3">Articles commandés</span>
                  {isLoadingItems ? (
                    <div className="py-4 text-center">
                      <span className="w-5 h-5 border-2 border-[#3D2216] border-t-transparent rounded-full animate-spin inline-block" />
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {activeItems.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center gap-4 text-xs pb-3 border-b border-[#3D2216]/5 last:border-0 last:pb-0">
                          <div>
                            <span className="font-bold text-[#3D2216] uppercase">{item.flavor}</span>
                            <span className="text-[9px] text-[#C4A484] font-black uppercase tracking-wider block mt-0.5">
                              {item.format} (x{item.quantity})
                            </span>
                            {item.allergens_snapshot && item.allergens_snapshot.length > 0 && (
                              <span className="text-[9px] text-red-600/80 block mt-1">
                                ⚠️ Allergènes : {item.allergens_snapshot.join(", ")}
                              </span>
                            )}
                          </div>
                          <span className="font-bold text-[#3D2216]">{formatPrice(item.line_total_cents)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Recalculated cost rows */}
                  <div className="h-px bg-[#3D2216]/10 my-4" />
                  <div className="flex flex-col gap-2.5 text-xs text-[#3D2216]">
                    <div className="flex justify-between">
                      <span className="text-[#3D2216]/50">Sous-total</span>
                      <span className="font-bold">{formatPrice(activeOrder.subtotal_cents)}</span>
                    </div>
                    {activeOrder.discount_cents > 0 && (
                      <div className="flex justify-between text-green-700">
                        <span>Réduction</span>
                        <span className="font-bold">-{formatPrice(activeOrder.discount_cents)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-[#3D2216]/50">Livraison</span>
                      <span className="font-bold">{formatPrice(activeOrder.delivery_fee_cents)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#3D2216]/50">TPS (5%)</span>
                      <span className="font-medium">{formatPrice(activeOrder.gst_amount_cents)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#3D2216]/50">TVQ (9.975%)</span>
                      <span className="font-medium">{formatPrice(activeOrder.qst_amount_cents)}</span>
                    </div>
                    <div className="h-px bg-[#3D2216]/5 my-2" />
                    <div className="flex justify-between font-black uppercase">
                      <span>Total Facturé</span>
                      <span>{formatPrice(activeOrder.total_cents)}</span>
                    </div>
                  </div>
                </div>

                {/* 4. Client Info card */}
                <div className="bg-white rounded-2xl p-5 border border-[#3D2216]/5 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#3D2216]/40 block mb-2">Coordonnées client</span>
                    <strong className="text-sm font-black text-[#3D2216] uppercase block">
                      {activeOrder.customer_first_name} {activeOrder.customer_last_name}
                    </strong>
                    <span className="text-xs text-[#3D2216]/80 block mt-1">Courriel : {activeOrder.customer_email}</span>
                    <span className="text-xs text-[#3D2216]/80 block mt-0.5">Téléphone : {activeOrder.customer_phone}</span>
                  </div>

                  <div className="md:col-span-2 h-px bg-[#3D2216]/10 my-1" />

                  <div className="md:col-span-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#3D2216]/40 block mb-1">
                      Mode : {activeOrder.fulfillment_type === "delivery" ? "Livraison à domicile" : "Cueillette sur place"}
                    </span>
                    {activeOrder.fulfillment_type === "delivery" ? (
                      <p className="text-xs text-[#3D2216]/80 font-light leading-relaxed mt-1">
                        Adresse : {activeOrder.delivery_address}
                        {activeOrder.delivery_apartment ? `, ${activeOrder.delivery_apartment}` : ""}<br />
                        {activeOrder.delivery_city}, {activeOrder.delivery_province}, {activeOrder.delivery_postal_code}
                      </p>
                    ) : (
                      <span className="text-xs text-[#3D2216]/80 font-light block mt-1">
                        Ramassage au comptoir BRWN
                      </span>
                    )}
                    {activeOrder.delivery_instructions && (
                      <p className="text-[11px] text-[#3D2216]/60 italic mt-2">
                        Instructions de livraison : {activeOrder.delivery_instructions}
                      </p>
                    )}
                    {activeOrder.order_notes && (
                      <p className="text-[11px] text-[#3D2216]/60 italic mt-2">
                        Note client : {activeOrder.order_notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* 5. Audit Log list for this order */}
                <div className="bg-white rounded-2xl p-5 border border-[#3D2216]/5 shadow-xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#3D2216]/40 block mb-3">Journal d'audit</span>
                  <div className="flex flex-col gap-3">
                    {logs
                      .filter((l) => l.order_id === activeOrder.id)
                      .map((log) => (
                        <div key={log.id} className="text-xs border-l-2 border-[#C4A484] pl-3 py-1 bg-[#FAF7F2]/50 rounded-r-lg">
                          <span className="text-[10px] text-[#3D2216]/50 block">
                            {new Date(log.created_at).toLocaleString("fr-CA")}
                          </span>
                          <p className="font-medium text-[#3D2216] mt-0.5">{log.note}</p>
                          {log.amount_cents && (
                            <span className="text-[10px] text-red-600 font-bold block mt-0.5">
                              Montant : {formatPrice(log.amount_cents)}
                            </span>
                          )}
                        </div>
                      ))}
                  </div>
                </div>

              </div>

            </div>
          </div>
        </div>
      )}
      {/* TEST EMAIL MODAL */}
      {isTestEmailOpen && (
        <div className="fixed inset-0 z-50 bg-[#150B07]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#F9F6F0] w-full max-w-md rounded-3xl p-6 md:p-8 border border-[#3D2216]/10 relative shadow-2xl text-left select-none">
            <button
              onClick={() => setIsTestEmailOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-[#3D2216]/5 text-[#3D2216] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <Mail className="w-5 h-5 text-[#C4A484]" />
              <span className="font-sans text-[10px] font-black tracking-widest text-[#C4A484] uppercase">
                Test Transactionnel
              </span>
            </div>

            <h3 className="font-sans text-xl font-black text-[#3D2216] uppercase tracking-tight mb-2">
              Envoyer un e-mail de test
            </h3>
            <p className="font-sans text-xs text-[#3D2216]/70 leading-relaxed mb-6 font-light">
              Générez et envoyez un reçu de commande de test. Une copie sera automatiquement envoyée à l'administrateur (<strong className="font-bold">brwndesserts@gmail.com</strong>).
            </p>

            {testEmailResult && (
              <div
                className={`mb-6 p-4 rounded-2xl text-xs font-semibold leading-relaxed border ${
                  testEmailResult.success
                    ? "bg-green-700/10 border-green-700/20 text-green-900"
                    : "bg-red-500/10 border-red-500/25 text-red-800"
                }`}
              >
                {testEmailResult.success ? "✅ " : "❌ "}
                {testEmailResult.message}
              </div>
            )}

            <form onSubmit={handleSendTestEmailSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-[#3D2216]/60">
                  Adresse E-mail du Destinataire *
                </label>
                <input
                  type="email"
                  required
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  placeholder="ex: brwndesserts@gmail.com"
                  className="w-full bg-white border border-[#3D2216]/10 focus:border-[#C4A484] rounded-xl py-3 px-4 text-xs font-medium outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-[#3D2216]/60">
                    Prénom Client *
                  </label>
                  <input
                    type="text"
                    required
                    value={testFirstName}
                    onChange={(e) => setTestFirstName(e.target.value)}
                    placeholder="ex: Jean"
                    className="w-full bg-white border border-[#3D2216]/10 focus:border-[#C4A484] rounded-xl py-3 px-4 text-xs font-medium outline-hidden"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-[#3D2216]/60">
                    N° de Commande *
                  </label>
                  <input
                    type="text"
                    required
                    value={testOrderNo}
                    onChange={(e) => setTestOrderNo(e.target.value)}
                    placeholder="ex: TEST-1001"
                    className="w-full bg-white border border-[#3D2216]/10 focus:border-[#C4A484] rounded-xl py-3 px-4 text-xs font-medium outline-hidden"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-[#3D2216]/60">
                  Mode de Service *
                </label>
                <select
                  value={testFulfillment}
                  onChange={(e) => setTestFulfillment(e.target.value)}
                  className="w-full bg-white border border-[#3D2216]/10 focus:border-[#C4A484] rounded-xl py-3 px-4 text-xs font-medium outline-hidden"
                >
                  <option value="pickup">Cueillette sur place (Paiement à la cueillette)</option>
                  <option value="delivery">Livraison à domicile (Paiement à la livraison)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isSendingTestEmail}
                className="w-full mt-2 py-3.5 bg-[#3D2216] hover:bg-[#150B07] disabled:opacity-50 text-[#F9F6F0] font-sans text-xs font-bold tracking-widest uppercase rounded-full transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                {isSendingTestEmail ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4 text-[#C4A484]" />
                    Envoyer le reçu de test
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
