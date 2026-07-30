import React from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/utils/supabase/admin";
import { CheckCircle2, ShoppingBag, MapPin, Calendar, Clock, CreditCard, Receipt } from "lucide-react";

export const metadata: Metadata = {
  title: "Confirmation de Commande | BRWN",
  robots: {
    index: false,
    follow: false,
  },
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderConfirmationPage({ params }: PageProps) {
  const resolvedParams = await params;
  const publicToken = resolvedParams.id;

  const supabase = createAdminClient();

  // Fetch order using the secure public token
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select(`
      id,
      order_number,
      customer_first_name,
      customer_last_name,
      customer_email,
      customer_phone,
      fulfillment_type,
      delivery_address,
      delivery_apartment,
      delivery_city,
      delivery_province,
      delivery_postal_code,
      delivery_instructions,
      order_notes,
      service_date,
      availability_slot_id,
      subtotal_cents,
      discount_cents,
      delivery_fee_cents,
      gst_amount_cents,
      qst_amount_cents,
      total_cents,
      payment_method,
      payment_status,
      fulfillment_status,
      created_at
    `)
    .eq("public_token", publicToken)
    .maybeSingle();

  if (orderErr || !order) {
    return notFound();
  }

  // Fetch slot details
  const { data: slot } = await supabase
    .from("availability_slots")
    .select("time_slot")
    .eq("id", order.availability_slot_id)
    .maybeSingle();

  // Fetch order items (only select non-sensitive fields)
  const { data: items } = await supabase
    .from("order_items")
    .select("flavor, format, quantity, unit_price_cents, line_total_cents")
    .eq("order_id", order.id);

  // Format pricing helper
  const formatPrice = (cents: number) => {
    return (cents / 100).toFixed(2) + " $ CAD";
  };

  const formattedDate = new Date(order.service_date + "T00:00:00").toLocaleDateString("fr-CA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const getFulfillmentLabel = (type: string) => {
    return type === "delivery" ? "Livraison à domicile" : "Cueillette sur place";
  };

  const getPaymentStatusLabel = (status: string) => {
    switch (status) {
      case "paid": return "Payée";
      case "cash_on_delivery": return "Paiement à la livraison";
      case "pay_on_pickup": return "Paiement à la cueillette";
      case "pending": return "En attente de paiement";
      case "failed": return "Échec de paiement";
      case "cancelled": return "Annulée";
      case "refunded": return "Remboursée";
      case "partially_refunded": return "Partiellement remboursée";
      default: return "En cours";
    }
  };

  const getFulfillmentStatusLabel = (status: string) => {
    switch (status) {
      case "pending": return "En attente de validation";
      case "confirmed": return "Confirmée";
      case "in_preparation": return "En cours de préparation";
      case "ready": return "Prête pour cueillette";
      case "out_for_delivery": return "En cours de livraison";
      case "completed": return "Livrée / Récupérée";
      case "cancelled": return "Annulée";
      default: return "Reçue";
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F6F0] font-sans pb-20 select-none">
      {/* Navbar header */}
      <header className="py-6 px-6 md:px-16 border-b border-[#3D2216]/5 flex items-center justify-center bg-white shadow-xs">
        <Link href="/" className="relative w-24 h-8 cursor-pointer">
          <Image src="/images/logo_brown.png" alt="BRWN Logo" fill className="object-contain" priority />
        </Link>
      </header>

      {/* Main card */}
      <main className="max-w-2xl mx-auto mt-12 px-6">
        <div className="bg-white rounded-3xl p-8 border border-[#3D2216]/5 shadow-sm text-center flex flex-col items-center">
          
          <CheckCircle2 className="w-16 h-16 text-green-600 mb-4 animate-bounce" />
          
          <span className="text-[10px] font-black uppercase tracking-widest text-[#C4A484]">
            Confirmation de commande
          </span>
          <h1 className="text-3xl font-black text-[#3D2216] uppercase tracking-tight mt-1 mb-2">
            Merci, {order.customer_first_name} !
          </h1>
          <p className="text-xs text-[#3D2216]/60 max-w-md leading-relaxed font-light mb-8">
            Votre commande <strong className="font-bold">{order.order_number}</strong> a bien été enregistrée. Un e-mail de confirmation vous a été envoyé.
          </p>

          <div className="w-full h-px bg-[#3D2216]/10 mb-8" />

          {/* Details Section */}
          <div className="w-full text-left grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            
            {/* Fulfillment schedule */}
            <div className="flex gap-3">
              <Calendar className="w-5 h-5 text-[#C4A484] shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#3D2216]/50 block">
                  Date et Mode
                </span>
                <span className="text-xs font-bold text-[#3D2216] capitalize block mt-0.5">
                  {getFulfillmentLabel(order.fulfillment_type)}
                </span>
                <span className="text-xs text-[#3D2216]/80 font-light block mt-1">
                  {formattedDate}
                </span>
                {slot && (
                  <span className="text-xs text-[#3D2216]/80 font-light block mt-0.5">
                    Créneau : {slot.time_slot}
                  </span>
                )}
              </div>
            </div>

            {/* Statuses */}
            <div className="flex gap-3">
              <Receipt className="w-5 h-5 text-[#C4A484] shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#3D2216]/50 block">
                  Statut de la Commande
                </span>
                <span className="text-xs font-bold text-[#3D2216] block mt-0.5">
                  Paiement : {getPaymentStatusLabel(order.payment_status)}
                </span>
                <span className="text-xs text-[#3D2216]/80 font-light block mt-1">
                  Préparation : {getFulfillmentStatusLabel(order.fulfillment_status)}
                </span>
              </div>
            </div>

            {/* Destination or pickup address */}
            <div className="flex gap-3 md:col-span-2">
              <MapPin className="w-5 h-5 text-[#C4A484] shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#3D2216]/50 block">
                  {order.fulfillment_type === "delivery" ? "Adresse de livraison" : "Lieu de ramassage"}
                </span>
                {order.fulfillment_type === "delivery" ? (
                  <p className="text-xs text-[#3D2216]/80 font-light leading-relaxed mt-1">
                    {order.delivery_address}
                    {order.delivery_apartment ? `, ${order.delivery_apartment}` : ""}<br />
                    {order.delivery_city}, {order.delivery_province}, {order.delivery_postal_code}
                  </p>
                ) : (
                  <p className="text-xs text-[#3D2216]/80 font-light leading-relaxed mt-1">
                    <strong className="font-bold">BRWN Montréal Central</strong><br />
                    123 Rue de Tiramisu, Montréal, QC<br />
                    <span className="text-[10px] text-[#3D2216]/60 italic block mt-1">
                      Présentez votre reçu pour récupérer vos tiramisus frais.
                    </span>
                  </p>
                )}
              </div>
            </div>

          </div>

          <div className="w-full h-px bg-[#3D2216]/10 mb-8" />

          {/* Items summary */}
          <div className="w-full text-left mb-8">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#3D2216] mb-4">
              Articles commandés
            </h3>
            <div className="flex flex-col gap-4">
              {items?.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center gap-4 text-xs">
                  <div>
                    <span className="font-bold text-[#3D2216] uppercase">{item.flavor}</span>
                    <span className="text-[10px] text-[#C4A484] font-black uppercase tracking-wider block mt-0.5">
                      {item.format} (x{item.quantity})
                    </span>
                  </div>
                  <span className="font-bold text-[#3D2216]">
                    {formatPrice(item.line_total_cents)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="w-full h-px bg-[#3D2216]/10 mb-6" />

          {/* Totals Recalculated from Server */}
          <div className="w-full text-left flex flex-col gap-2.5 text-xs mb-8">
            <div className="flex justify-between items-center text-[#3D2216]/60">
              <span>Sous-total</span>
              <span className="font-bold text-[#3D2216]">{formatPrice(order.subtotal_cents)}</span>
            </div>
            {order.discount_cents > 0 && (
              <div className="flex justify-between items-center text-green-700">
                <span>Rabais code promo</span>
                <span className="font-bold">-{formatPrice(order.discount_cents)}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-[#3D2216]/60">
              <span>Frais de livraison</span>
              <span className="font-bold text-[#3D2216]">
                {order.fulfillment_type === "delivery" ? (order.delivery_fee_cents === 0 ? "Gratuit" : formatPrice(order.delivery_fee_cents)) : "Cueillette"}
              </span>
            </div>
            <div className="flex justify-between items-center text-[#3D2216]/60">
              <span>TPS (5 %)</span>
              <span className="font-medium">{formatPrice(order.gst_amount_cents)}</span>
            </div>
            <div className="flex justify-between items-center text-[#3D2216]/60">
              <span>TVQ (9.975 %)</span>
              <span className="font-medium">{formatPrice(order.qst_amount_cents)}</span>
            </div>
            <div className="h-px bg-[#3D2216]/10 my-2" />
            <div className="flex justify-between items-center text-sm font-black uppercase text-[#3D2216]">
              <span>Total payé</span>
              <span className="text-lg text-[#3D2216]">{formatPrice(order.total_cents)}</span>
            </div>
          </div>

          <Link
            href="/"
            className="w-full py-4 bg-[#3D2216] hover:bg-[#150B07] text-[#F9F6F0] font-sans text-xs font-semibold tracking-widest uppercase rounded-full shadow-md transition-all duration-300 hover:scale-105 active:scale-95 text-center flex items-center justify-center gap-2 cursor-pointer"
          >
            Retourner à l'accueil
            <ShoppingBag className="w-4 h-4" />
          </Link>
        </div>
      </main>
    </div>
  );
}
