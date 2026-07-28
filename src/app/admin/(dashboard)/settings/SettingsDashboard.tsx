"use client";

import React, { useState } from "react";
import { Save, Plus, Trash2, ShieldCheck, MapPin, Calendar, Clock, Percent, AlertTriangle } from "lucide-react";

interface Props {
  settings: any;
  zones: any[];
  slots: any[];
  closedDates: any[];
  promos: any[];
}

const formatPrice = (cents: number) => {
  return (cents / 100).toFixed(2) + " $";
};

export default function SettingsDashboard({ settings, zones, slots, closedDates, promos }: Props) {
  const [activeTab, setActiveTab] = useState("general");
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // General Settings State
  const [pickupAddress, setPickupAddress] = useState(settings.pickup_address);
  const [pickupInstructions, setPickupInstructions] = useState(settings.pickup_instructions);
  const [prepDelay, setPrepDelay] = useState(settings.preparation_delay_hours.toString());
  const [minOrder, setMinOrder] = useState((settings.min_order_cents / 100).toString());
  const [freeDeliveryMin, setFreeDeliveryMin] = useState((settings.free_delivery_min_cents / 100).toString());
  const [taxGst, setTaxGst] = useState(settings.tax_rate_gst.toString());
  const [taxQst, setTaxQst] = useState(settings.tax_rate_qst.toString());
  const [stripeEnabled, setStripeEnabled] = useState(settings.stripe_enabled);
  const [codEnabled, setCodEnabled] = useState(settings.cod_enabled);
  const [copEnabled, setCopEnabled] = useState(settings.cop_enabled);

  // Dynamic Data Lists States
  const [zoneList, setZoneList] = useState(zones);
  const [slotList, setSlotList] = useState(slots);
  const [closedDateList, setClosedDateList] = useState(closedDates);
  const [promoList, setPromoList] = useState(promos);

  // Forms states for inserting new items
  const [newZone, setNewZone] = useState({ name: "", prefixes: "", fee: "5.00", min: "15.00" });
  const [newSlot, setNewSlot] = useState({ day: "1", label: "12:00 - 14:00", max: "10" });
  const [newClosed, setNewClosed] = useState({ date: "", reason: "" });
  const [newPromo, setNewPromo] = useState({ code: "", type: "percentage", val: "10", min: "0", maxDiscount: "", maxUses: "" });

  const triggerAlert = (msg: string, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setMessage("");
    } else {
      setMessage(msg);
      setErrorMsg("");
    }
    setTimeout(() => {
      setMessage("");
      setErrorMsg("");
    }, 4000);
  };

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_global",
          payload: {
            pickup_address: pickupAddress,
            pickup_instructions: pickupInstructions,
            preparation_delay_hours: prepDelay,
            min_order_cents: minOrder,
            free_delivery_min_cents: freeDeliveryMin,
            tax_rate_gst: taxGst,
            tax_rate_qst: taxQst,
            stripe_enabled: stripeEnabled,
            cod_enabled: codEnabled,
            cop_enabled: copEnabled,
          },
        }),
      });

      if (res.ok) {
        triggerAlert("Configurations générales sauvegardées avec succès !");
      } else {
        triggerAlert("Échec de la sauvegarde.", true);
      }
    } catch (err) {
      triggerAlert("Erreur de communication.", true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newZone.name || !newZone.prefixes) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_zone",
          payload: {
            name: newZone.name,
            postal_code_prefixes: newZone.prefixes,
            delivery_fee_cents: newZone.fee,
            min_order_cents: newZone.min,
          },
        }),
      });

      if (res.ok) {
        triggerAlert("Zone de livraison créée !");
        // Reload page data or update state
        window.location.reload();
      } else {
        triggerAlert("Échec de création.", true);
      }
    } catch (err) {
      triggerAlert("Erreur.", true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteZone = async (id: string) => {
    if (!confirm("Voulez-vous supprimer cette zone de livraison ?")) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_zone",
          payload: { id },
        }),
      });
      if (res.ok) {
        setZoneList(zoneList.filter((z) => z.id !== id));
        triggerAlert("Zone de livraison supprimée.");
      } else {
        triggerAlert("Échec de suppression.", true);
      }
    } catch (err) {
      triggerAlert("Erreur.", true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSlot.label) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_slot",
          payload: {
            day_of_week: newSlot.day,
            time_slot: newSlot.label,
            max_orders: newSlot.max,
          },
        }),
      });

      if (res.ok) {
        triggerAlert("Créneau horaire ajouté !");
        window.location.reload();
      } else {
        triggerAlert("Échec.", true);
      }
    } catch (err) {
      triggerAlert("Erreur.", true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSlot = async (id: string) => {
    if (!confirm("Supprimer ce créneau horaire ?")) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_slot",
          payload: { id },
        }),
      });
      if (res.ok) {
        setSlotList(slotList.filter((s) => s.id !== id));
        triggerAlert("Créneau supprimé.");
      } else {
        triggerAlert("Échec.", true);
      }
    } catch (err) {
      triggerAlert("Erreur.", true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddClosed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClosed.date) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_closed_date",
          payload: {
            closed_date: newClosed.date,
            reason: newClosed.reason,
          },
        }),
      });
      if (res.ok) {
        triggerAlert("Date de fermeture enregistrée !");
        window.location.reload();
      } else {
        triggerAlert("Date déjà fermée ou incorrecte.", true);
      }
    } catch (err) {
      triggerAlert("Erreur.", true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClosed = async (id: string) => {
    if (!confirm("Ouvrir à nouveau cette date ?")) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_closed_date",
          payload: { id },
        }),
      });
      if (res.ok) {
        setClosedDateList(closedDateList.filter((c) => c.id !== id));
        triggerAlert("Date réouverte.");
      } else {
        triggerAlert("Échec.", true);
      }
    } catch (err) {
      triggerAlert("Erreur.", true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromo.code || !newPromo.val) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_promo",
          payload: {
            code: newPromo.code,
            discount_type: newPromo.type,
            discount_value: newPromo.val,
            min_order_cents: newPromo.min,
            max_discount_cents: newPromo.maxDiscount || null,
            max_uses: newPromo.maxUses || null,
          },
        }),
      });
      if (res.ok) {
        triggerAlert("Code promo ajouté avec succès !");
        window.location.reload();
      } else {
        triggerAlert("Code promo déjà existant ou invalide.", true);
      }
    } catch (err) {
      triggerAlert("Erreur.", true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePromo = async (id: string) => {
    if (!confirm("Supprimer ce code promo ?")) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_promo",
          payload: { id },
        }),
      });
      if (res.ok) {
        setPromoList(promoList.filter((p) => p.id !== id));
        triggerAlert("Code promo supprimé.");
      } else {
        triggerAlert("Échec.", true);
      }
    } catch (err) {
      triggerAlert("Erreur.", true);
    } finally {
      setIsLoading(false);
    }
  };

  const getDayName = (day: number) => {
    const days = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
    return days[day];
  };

  return (
    <div className="flex flex-col md:flex-row gap-8 font-sans select-none text-[#3D2216]">
      {/* Sidebar Tabs */}
      <div className="w-full md:w-64 bg-white rounded-3xl p-5 border border-[#3D2216]/5 shadow-xs shrink-0 flex flex-col gap-2 h-fit">
        {[
          { id: "general", label: "Réglages Généraux", icon: ShieldCheck },
          { id: "zones", label: "Zones de Livraison", icon: MapPin },
          { id: "slots", label: "Créneaux de Service", icon: Clock },
          { id: "closed", label: "Fermetures Exceptionnelles", icon: Calendar },
          { id: "promos", label: "Codes Promotionnels", icon: Percent }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full p-3 rounded-xl text-left text-xs font-bold uppercase tracking-wider flex items-center gap-2.5 transition-all cursor-pointer ${
                activeTab === tab.id
                  ? "bg-[#3D2216] text-[#F9F6F0] shadow-sm"
                  : "bg-white text-[#3D2216]/75 hover:bg-[#3D2216]/5 border border-transparent"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Form Content container */}
      <div className="flex-1">
        {message && (
          <div className="mb-4 p-4 bg-green-500/10 border border-green-500/25 rounded-2xl text-xs font-bold text-green-800 uppercase tracking-wider">
            {message}
          </div>
        )}
        {errorMsg && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/25 rounded-2xl text-xs font-bold text-red-700 uppercase tracking-wider">
            {errorMsg}
          </div>
        )}

        {/* Tab 1: General settings */}
        {activeTab === "general" && (
          <form onSubmit={handleSaveGeneral} className="bg-white rounded-3xl p-6 md:p-8 border border-[#3D2216]/5 shadow-xs flex flex-col gap-6">
            
            {/* Warning Header */}
            <div className="bg-[#FAF7F2] border border-[#3D2216]/10 rounded-2xl p-4 flex gap-3 text-xs leading-relaxed text-[#3D2216]/80 font-light">
              <AlertTriangle className="w-5 h-5 shrink-0 text-[#D97706]" />
              <div>
                <strong className="font-bold text-[#3D2216] block uppercase tracking-wide mb-1">Avertissement Réglementaire</strong>
                Les taux fiscaux (TPS/TVQ) et les réglages de taxation ci-dessous affectent les reçus de vente légaux générés pour vos clients à Montréal et au Québec. Toute modification doit respecter les directives de Revenu Québec.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Pickup info */}
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-[#3D2216]/60">Adresse de Ramassage Boutique</label>
                <input
                  type="text"
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  className="w-full bg-[#FAF7F2] border border-[#3D2216]/10 focus:border-[#C4A484] rounded-xl py-3 px-4 text-xs font-medium"
                />
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-[#3D2216]/60">Instructions de Récupération</label>
                <textarea
                  value={pickupInstructions}
                  onChange={(e) => setPickupInstructions(e.target.value)}
                  className="w-full bg-[#FAF7F2] border border-[#3D2216]/10 focus:border-[#C4A484] rounded-xl py-3 px-4 text-xs font-medium h-20 resize-none"
                />
              </div>

              {/* Rules and prep time */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-[#3D2216]/60">Délai de Préparation minimum (Heures)</label>
                <input
                  type="number"
                  value={prepDelay}
                  onChange={(e) => setPrepDelay(e.target.value)}
                  className="w-full bg-[#FAF7F2] border border-[#3D2216]/10 focus:border-[#C4A484] rounded-xl py-3 px-4 text-xs font-medium"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-[#3D2216]/60">Panier Minimum ($ CAD)</label>
                <input
                  type="number"
                  step="0.01"
                  value={minOrder}
                  onChange={(e) => setMinOrder(e.target.value)}
                  className="w-full bg-[#FAF7F2] border border-[#3D2216]/10 focus:border-[#C4A484] rounded-xl py-3 px-4 text-xs font-medium"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-[#3D2216]/60">Seuil Livraison Gratuite ($ CAD)</label>
                <input
                  type="number"
                  step="0.01"
                  value={freeDeliveryMin}
                  onChange={(e) => setFreeDeliveryMin(e.target.value)}
                  className="w-full bg-[#FAF7F2] border border-[#3D2216]/10 focus:border-[#C4A484] rounded-xl py-3 px-4 text-xs font-medium"
                />
              </div>

              <div className="h-px bg-[#3D2216]/10 md:col-span-2 my-2" />

              {/* Taxes */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-[#3D2216]/60">Taux TPS (Fédéral - ex: 0.05 pour 5%)</label>
                <input
                  type="number"
                  step="0.001"
                  value={taxGst}
                  onChange={(e) => setTaxGst(e.target.value)}
                  className="w-full bg-[#FAF7F2] border border-[#3D2216]/10 focus:border-[#C4A484] rounded-xl py-3 px-4 text-xs font-medium"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-[#3D2216]/60">Taux TVQ (Québec - ex: 0.09975 pour 9.975%)</label>
                <input
                  type="number"
                  step="0.00001"
                  value={taxQst}
                  onChange={(e) => setTaxQst(e.target.value)}
                  className="w-full bg-[#FAF7F2] border border-[#3D2216]/10 focus:border-[#C4A484] rounded-xl py-3 px-4 text-xs font-medium"
                />
              </div>

              <div className="h-px bg-[#3D2216]/10 md:col-span-2 my-2" />

              {/* Payment toggles */}
              <div className="md:col-span-2 flex flex-col gap-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#3D2216]/40">Méthodes de Paiement acceptées</span>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-3 text-xs">
                    <input
                      type="checkbox"
                      checked={stripeEnabled && settings.stripe_keys_configured}
                      disabled={!settings.stripe_keys_configured}
                      onChange={(e) => setStripeEnabled(e.target.checked)}
                      className="accent-[#3D2216]"
                    />
                    <span className={!settings.stripe_keys_configured ? "text-[#3D2216]/50" : ""}>
                      Activer le paiement sécurisé par carte en ligne (Stripe)
                    </span>
                  </label>
                  {!settings.stripe_keys_configured && (
                    <span className="text-[10px] text-amber-800 font-medium block ml-6 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg">
                      ⚠️ <strong>Stripe non configuré</strong> : les variables d'environnement (clés API) sont absentes. Le paiement par carte est actuellement inactif.
                    </span>
                  )}
                  <label className="flex items-center gap-3 text-xs">
                    <input
                      type="checkbox"
                      checked={codEnabled}
                      onChange={(e) => setCodEnabled(e.target.checked)}
                      className="accent-[#3D2216]"
                    />
                    <span>Activer le paiement à la livraison (COD)</span>
                  </label>
                  <label className="flex items-center gap-3 text-xs">
                    <input
                      type="checkbox"
                      checked={copEnabled}
                      onChange={(e) => setCopEnabled(e.target.checked)}
                      className="accent-[#3D2216]"
                    />
                    <span>Activer le paiement à la cueillette boutique (COP)</span>
                  </label>
                </div>
              </div>

            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-4 px-6 py-3 bg-[#3D2216] hover:bg-[#150B07] text-[#F9F6F0] rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer w-fit shadow-xs disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              Sauvegarder
            </button>
          </form>
        )}

        {/* Tab 2: Delivery Zones */}
        {activeTab === "zones" && (
          <div className="flex flex-col gap-6">
            {/* Add Zone */}
            <form onSubmit={handleAddZone} className="bg-white rounded-3xl p-6 border border-[#3D2216]/5 shadow-xs flex flex-col gap-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#3D2216]/40">Ajouter une zone</span>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold uppercase">Nom de la Zone</label>
                  <input
                    type="text"
                    required
                    placeholder="Montréal Centre-Ville"
                    value={newZone.name}
                    onChange={(e) => setNewZone({ ...newZone, name: e.target.value })}
                    className="w-full bg-[#FAF7F2] border border-[#3D2216]/10 rounded-xl py-2 px-3 text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold uppercase">Préfixes Postaux (ex: H2W, H3A)</label>
                  <input
                    type="text"
                    required
                    placeholder="H2W, H3A, H2X"
                    value={newZone.prefixes}
                    onChange={(e) => setNewZone({ ...newZone, prefixes: e.target.value })}
                    className="w-full bg-[#FAF7F2] border border-[#3D2216]/10 rounded-xl py-2 px-3 text-xs uppercase"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold uppercase">Frais ($ CAD)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newZone.fee}
                    onChange={(e) => setNewZone({ ...newZone, fee: e.target.value })}
                    className="w-full bg-[#FAF7F2] border border-[#3D2216]/10 rounded-xl py-2 px-3 text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold uppercase">Minimum Panier ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newZone.min}
                    onChange={(e) => setNewZone({ ...newZone, min: e.target.value })}
                    className="w-full bg-[#FAF7F2] border border-[#3D2216]/10 rounded-xl py-2 px-3 text-xs"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2.5 bg-[#3D2216] hover:bg-[#150B07] text-[#F9F6F0] rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 w-fit cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                Ajouter la zone
              </button>
            </form>

            {/* Zones List */}
            <div className="bg-white rounded-3xl border border-[#3D2216]/5 shadow-xs overflow-hidden">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#3D2216]/10 text-[#3D2216]/50 uppercase tracking-widest text-[9px] font-black">
                    <th className="py-3 px-6">Zone</th>
                    <th className="py-3 px-4">Préfixes</th>
                    <th className="py-3 px-4">Frais de livraison</th>
                    <th className="py-3 px-4">Achat minimum</th>
                    <th className="py-3 px-6 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3D2216]/5 text-xs">
                  {zoneList.map((zone) => (
                    <tr key={zone.id} className="hover:bg-[#FAF7F2]/50">
                      <td className="py-3.5 px-6 font-bold">{zone.name}</td>
                      <td className="py-3.5 px-4 font-mono text-[10px]">{zone.postal_code_prefixes.join(", ")}</td>
                      <td className="py-3.5 px-4 font-bold">{formatPrice(zone.delivery_fee_cents)}</td>
                      <td className="py-3.5 px-4 font-medium">{formatPrice(zone.min_order_cents)}</td>
                      <td className="py-3.5 px-6 text-center">
                        <button
                          onClick={() => handleDeleteZone(zone.id)}
                          className="p-1 hover:bg-red-500/10 text-[#3D2216]/40 hover:text-red-600 rounded-full cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Availability Slots */}
        {activeTab === "slots" && (
          <div className="flex flex-col gap-6">
            {/* Add Slot */}
            <form onSubmit={handleAddSlot} className="bg-white rounded-3xl p-6 border border-[#3D2216]/5 shadow-xs flex flex-col gap-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#3D2216]/40">Ajouter un créneau horaire</span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold uppercase">Jour de la Semaine</label>
                  <select
                    value={newSlot.day}
                    onChange={(e) => setNewSlot({ ...newSlot, day: e.target.value })}
                    className="w-full bg-[#FAF7F2] border border-[#3D2216]/10 rounded-xl py-2 px-3 text-xs outline-hidden"
                  >
                    <option value="1">Lundi</option>
                    <option value="2">Mardi</option>
                    <option value="3">Mercredi</option>
                    <option value="4">Jeudi</option>
                    <option value="5">Vendredi</option>
                    <option value="6">Samedi</option>
                    <option value="0">Dimanche</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold uppercase">Plage Horaire (Texte libre)</label>
                  <input
                    type="text"
                    required
                    placeholder="14:00 - 16:00"
                    value={newSlot.label}
                    onChange={(e) => setNewSlot({ ...newSlot, label: e.target.value })}
                    className="w-full bg-[#FAF7F2] border border-[#3D2216]/10 rounded-xl py-2 px-3 text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold uppercase">Capacité maximale de commandes</label>
                  <input
                    type="number"
                    required
                    value={newSlot.max}
                    onChange={(e) => setNewSlot({ ...newSlot, max: e.target.value })}
                    className="w-full bg-[#FAF7F2] border border-[#3D2216]/10 rounded-xl py-2 px-3 text-xs"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2.5 bg-[#3D2216] hover:bg-[#150B07] text-[#F9F6F0] rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 w-fit cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                Ajouter le créneau
              </button>
            </form>

            {/* Slots List */}
            <div className="bg-white rounded-3xl border border-[#3D2216]/5 shadow-xs overflow-hidden">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#3D2216]/10 text-[#3D2216]/50 uppercase tracking-widest text-[9px] font-black">
                    <th className="py-3 px-6">Jour</th>
                    <th className="py-3 px-4">Créneau</th>
                    <th className="py-3 px-4">Capacité max</th>
                    <th className="py-3 px-6 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3D2216]/5 text-xs">
                  {slotList.map((slot) => (
                    <tr key={slot.id} className="hover:bg-[#FAF7F2]/50">
                      <td className="py-3.5 px-6 font-bold">{getDayName(slot.day_of_week)}</td>
                      <td className="py-3.5 px-4 font-medium uppercase">{slot.time_slot}</td>
                      <td className="py-3.5 px-4 font-bold">{slot.max_orders} commandes</td>
                      <td className="py-3.5 px-6 text-center">
                        <button
                          onClick={() => handleDeleteSlot(slot.id)}
                          className="p-1 hover:bg-red-500/10 text-[#3D2216]/40 hover:text-red-600 rounded-full cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Closed Dates */}
        {activeTab === "closed" && (
          <div className="flex flex-col gap-6">
            {/* Add Date */}
            <form onSubmit={handleAddClosed} className="bg-white rounded-3xl p-6 border border-[#3D2216]/5 shadow-xs flex flex-col gap-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#3D2216]/40">Ajouter une date de fermeture</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold uppercase">Date</label>
                  <input
                    type="date"
                    required
                    value={newClosed.date}
                    onChange={(e) => setNewClosed({ ...newClosed, date: e.target.value })}
                    className="w-full bg-[#FAF7F2] border border-[#3D2216]/10 rounded-xl py-2 px-3 text-xs outline-hidden"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold uppercase">Raison de la fermeture</label>
                  <input
                    type="text"
                    placeholder="Congés annuels, jour férié..."
                    value={newClosed.reason}
                    onChange={(e) => setNewClosed({ ...newClosed, reason: e.target.value })}
                    className="w-full bg-[#FAF7F2] border border-[#3D2216]/10 rounded-xl py-2 px-3 text-xs"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2.5 bg-[#3D2216] hover:bg-[#150B07] text-[#F9F6F0] rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 w-fit cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                Fermer cette date
              </button>
            </form>

            {/* Closed Dates list */}
            <div className="bg-white rounded-3xl border border-[#3D2216]/5 shadow-xs overflow-hidden">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#3D2216]/10 text-[#3D2216]/50 uppercase tracking-widest text-[9px] font-black">
                    <th className="py-3 px-6">Date</th>
                    <th className="py-3 px-4">Raison</th>
                    <th className="py-3 px-6 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3D2216]/5 text-xs">
                  {closedDateList.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-[#3D2216]/40">Aucune fermeture programmée.</td>
                    </tr>
                  ) : (
                    closedDateList.map((c) => (
                      <tr key={c.id} className="hover:bg-[#FAF7F2]/50">
                        <td className="py-3.5 px-6 font-bold">{c.closed_date}</td>
                        <td className="py-3.5 px-4 font-medium text-[#3D2216]/70">{c.reason || "Fermeture"}</td>
                        <td className="py-3.5 px-6 text-center">
                          <button
                            onClick={() => handleDeleteClosed(c.id)}
                            className="p-1 hover:bg-red-500/10 text-[#3D2216]/40 hover:text-red-600 rounded-full cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 5: Promo Codes */}
        {activeTab === "promos" && (
          <div className="flex flex-col gap-6">
            {/* Add Promo */}
            <form onSubmit={handleAddPromo} className="bg-white rounded-3xl p-6 border border-[#3D2216]/5 shadow-xs flex flex-col gap-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#3D2216]/40">Créer un code promotionnel</span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold uppercase">Code (Unique)</label>
                  <input
                    type="text"
                    required
                    placeholder="SUMMER20"
                    value={newPromo.code}
                    onChange={(e) => setNewPromo({ ...newPromo, code: e.target.value })}
                    className="w-full bg-[#FAF7F2] border border-[#3D2216]/10 rounded-xl py-2 px-3 text-xs uppercase"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold uppercase">Type de Réduction</label>
                  <select
                    value={newPromo.type}
                    onChange={(e) => setNewPromo({ ...newPromo, type: e.target.value })}
                    className="w-full bg-[#FAF7F2] border border-[#3D2216]/10 rounded-xl py-2 px-3 text-xs outline-hidden"
                  >
                    <option value="percentage">Pourcentage (%)</option>
                    <option value="fixed_amount">Montant fixe ($ CAD)</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold uppercase">Valeur de la réduction</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder={newPromo.type === "percentage" ? "15 (pour 15%)" : "10.00"}
                    value={newPromo.val}
                    onChange={(e) => setNewPromo({ ...newPromo, val: e.target.value })}
                    className="w-full bg-[#FAF7F2] border border-[#3D2216]/10 rounded-xl py-2 px-3 text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold uppercase">Achat panier minimum ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newPromo.min}
                    onChange={(e) => setNewPromo({ ...newPromo, min: e.target.value })}
                    className="w-full bg-[#FAF7F2] border border-[#3D2216]/10 rounded-xl py-2 px-3 text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold uppercase">Nombre maximal d'utilisations</label>
                  <input
                    type="number"
                    placeholder="Illimité"
                    value={newPromo.maxUses}
                    onChange={(e) => setNewPromo({ ...newPromo, maxUses: e.target.value })}
                    className="w-full bg-[#FAF7F2] border border-[#3D2216]/10 rounded-xl py-2 px-3 text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold uppercase">Réduction maximale ($ - optionnel)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Aucune limite"
                    value={newPromo.maxDiscount}
                    onChange={(e) => setNewPromo({ ...newPromo, maxDiscount: e.target.value })}
                    className="w-full bg-[#FAF7F2] border border-[#3D2216]/10 rounded-xl py-2 px-3 text-xs"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2.5 bg-[#3D2216] hover:bg-[#150B07] text-[#F9F6F0] rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 w-fit cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                Créer le code promo
              </button>
            </form>

            {/* Promos List */}
            <div className="bg-white rounded-3xl border border-[#3D2216]/5 shadow-xs overflow-hidden">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#3D2216]/10 text-[#3D2216]/50 uppercase tracking-widest text-[9px] font-black">
                    <th className="py-3 px-6">Code</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Valeur</th>
                    <th className="py-3 px-4">Panier min</th>
                    <th className="py-3 px-4">Utilisations</th>
                    <th className="py-3 px-6 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3D2216]/5 text-xs">
                  {promoList.map((promo) => (
                    <tr key={promo.id} className="hover:bg-[#FAF7F2]/50">
                      <td className="py-3.5 px-6 font-bold uppercase text-[#3D2216]">{promo.code}</td>
                      <td className="py-3.5 px-4 font-medium uppercase text-[10px]">
                        {promo.discount_type === "percentage" ? "Pourcentage" : "Montant Fixe"}
                      </td>
                      <td className="py-3.5 px-4 font-black">
                        {promo.discount_type === "percentage" ? `${promo.discount_value} %` : formatPrice(promo.discount_value)}
                      </td>
                      <td className="py-3.5 px-4">{formatPrice(promo.min_order_cents)}</td>
                      <td className="py-3.5 px-4 font-bold text-[#3D2216]/75">
                        {promo.uses_count} / {promo.max_uses || "∞"}
                      </td>
                      <td className="py-3.5 px-6 text-center">
                        <button
                          onClick={() => handleDeletePromo(promo.id)}
                          className="p-1 hover:bg-red-500/10 text-[#3D2216]/40 hover:text-red-600 rounded-full cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
