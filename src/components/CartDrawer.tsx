"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, Plus, Minus, Trash2, ShoppingBag } from "lucide-react";
import { useCart } from "@/context/CartContext";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { cartItems, updateQuantity, removeItem, subtotalCents, isMounted } = useCart();

  // Prevent scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isMounted || !isOpen) return null;

  const formatPrice = (cents: number) => {
    return (cents / 100).toFixed(2) + " $ CAD";
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none font-sans">
      {/* Overlay backdrop */}
      <div
        className="absolute inset-0 bg-[#150B07]/60 backdrop-blur-xs transition-opacity duration-500 ease-in-out"
        onClick={onClose}
      />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        {/* Drawer Panel */}
        <div className="w-screen max-w-md bg-[#F9F6F0] border-l border-[#3D2216]/10 flex flex-col shadow-2xl relative">
          
          {/* Header */}
          <div className="px-6 py-6 border-b border-[#3D2216]/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#3D2216]" />
              <h2 className="text-lg font-black uppercase tracking-tight text-[#3D2216]">
                Votre Panier
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-[#3D2216]/5 text-[#3D2216] cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart items list */}
          <div className="flex-1 overflow-y-auto py-6 px-6">
            {cartItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center gap-4">
                <div className="p-4 bg-[#EADDC9]/30 rounded-full text-[#C4A484]">
                  <ShoppingBag className="w-10 h-10" />
                </div>
                <h3 className="text-base font-bold uppercase tracking-wider text-[#3D2216]">
                  Votre panier est vide
                </h3>
                <p className="text-xs text-[#3D2216]/60 max-w-xs font-light">
                  Découvrez nos tiramisus et ajoutez vos saveurs préférées au panier !
                </p>
                <button
                  onClick={onClose}
                  className="mt-2 px-6 py-2.5 bg-[#3D2216] hover:bg-[#150B07] text-[#F9F6F0] text-xs font-bold tracking-widest uppercase rounded-full transition-all"
                >
                  Continuer vos achats
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {cartItems.map((item, idx) => (
                  <div
                    key={`${item.productId}-${item.format}`}
                    className={`flex items-center gap-4 pb-6 ${
                      idx < cartItems.length - 1 ? "border-b border-[#3D2216]/5" : ""
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="relative w-20 h-20 bg-[#FAF7F2] border border-[#3D2216]/5 rounded-xl shrink-0 flex items-center justify-center p-1">
                      <Image
                        src={item.image_url}
                        alt={item.name}
                        fill
                        sizes="80px"
                        quality={80}
                        className="object-contain"
                      />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-sans font-black text-sm uppercase tracking-wide text-[#3D2216] truncate">
                        {item.name}
                      </h4>
                      <p className="text-[10px] font-bold text-[#C4A484] uppercase tracking-wider mt-0.5">
                        {item.format}
                      </p>

                      <div className="flex items-center justify-between mt-3">
                        {/* Quantity Selector */}
                        <div className="flex items-center bg-[#FAF7F2] border border-[#3D2216]/10 rounded-full py-1 px-2.5">
                          <button
                            onClick={() => updateQuantity(item.productId, item.format, item.quantity - 1)}
                            className="w-5 h-5 flex items-center justify-center text-[#3D2216]/60 hover:text-[#3D2216] font-bold transition-colors cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center font-sans text-xs text-[#3D2216] font-bold">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.productId, item.format, item.quantity + 1)}
                            className="w-5 h-5 flex items-center justify-center text-[#3D2216]/60 hover:text-[#3D2216] font-bold transition-colors cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Price */}
                        <span className="font-sans text-xs font-bold text-[#3D2216]">
                          {formatPrice(item.priceUnitCents * item.quantity)}
                        </span>
                      </div>
                    </div>

                    {/* Remove button */}
                    <button
                      onClick={() => removeItem(item.productId, item.format)}
                      className="p-1.5 hover:bg-red-500/10 text-[#3D2216]/40 hover:text-red-600 rounded-full transition-colors cursor-pointer shrink-0"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {cartItems.length > 0 && (
            <div className="border-t border-[#3D2216]/10 bg-white p-6 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <span className="font-sans text-xs text-[#3D2216]/50 uppercase tracking-widest font-bold">
                  Sous-total estimé
                </span>
                <span className="font-sans text-xl font-black text-[#3D2216]">
                  {formatPrice(subtotalCents)}
                </span>
              </div>

              <div className="bg-[#FAF7F2] border border-[#3D2216]/5 rounded-xl p-3 text-[10px] text-[#3D2216]/60 leading-relaxed font-light">
                ⚠️ Les taxes, réductions et frais de livraison définitifs seront calculés et confirmés sur la page de paiement.
              </div>

              <Link
                href="/checkout"
                onClick={onClose}
                className="w-full py-4 bg-[#3D2216] hover:bg-[#150B07] text-[#F9F6F0] font-sans text-xs font-semibold tracking-widest uppercase rounded-full shadow-md transition-all duration-300 hover:scale-105 active:scale-95 text-center flex items-center justify-center gap-2 cursor-pointer"
              >
                Passer la commande
                <ShoppingBag className="w-4 h-4" />
              </Link>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
