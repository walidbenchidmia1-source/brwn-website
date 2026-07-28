"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { Check, ShoppingBag, Truck, Info, Award } from "lucide-react";

export default function OrderSection() {
  const [selectedPack, setSelectedPack] = useState(2); // Default is Deluxe Box (index 2)
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

  const packs = [
    {
      id: 1,
      name: "Le Solo",
      subtitle: "Plaisir Personnel",
      desc: "1 pot en verre de Tiramisu Original (220g). Livré avec sa cuillère en bois.",
      price: 12,
      badge: null,
    },
    {
      id: 2,
      name: "Le Duo",
      subtitle: "Instants Partagés",
      desc: "Coffret de 2 pots en verre (220g x 2). Idéal pour un moment à deux.",
      price: 22,
      badge: "Populaire",
    },
    {
      id: 3,
      name: "Le Deluxe Box",
      subtitle: "L'Expérience Complète",
      desc: "Écrin cartonné contenant 4 pots en verre, livré avec 2 cuillères dorées de dégustation.",
      price: 40,
      badge: "Recommandé",
    },
  ];

  const currentPrice = packs[selectedPack - 1].price * quantity;

  const handleAddToCart = () => {
    if (isAdding || isAdded) return;
    setIsAdding(true);

    // Simulate luxury loader
    setTimeout(() => {
      setIsAdding(false);
      setIsAdded(true);
      
      // Success pop animation
      gsap.fromTo(
        successRef.current,
        { scale: 0.8, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.7)" }
      );

      // Reset after 3 seconds
      setTimeout(() => {
        gsap.to(successRef.current, {
          opacity: 0,
          scale: 0.8,
          duration: 0.3,
          onComplete: () => setIsAdded(false),
        });
      }, 3000);
    }, 1200);
  };

  return (
    <section
      id="order"
      ref={sectionRef}
      className="relative w-full bg-[#FAF7F2] py-24 px-6 md:px-12"
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          
          {/* Left Column: Product Visuals */}
          <div className="lg:col-span-6 relative flex justify-center items-center">
            {/* Soft decorative background panel */}
            <div className="absolute w-[80%] h-[80%] bg-[#DFD3C3]/20 rounded-3xl -rotate-3 z-0" />
            
            <div className="relative w-[320px] h-[320px] sm:w-[450px] sm:h-[450px] z-10">
              <Image
                src="/images/tiramisu_product.png"
                alt="BRWN Deluxe Packaging"
                fill
                sizes="(max-width: 640px) 320px, 450px"
                className="object-contain filter drop-shadow-2xl"
              />
            </div>
            
            {/* Small floating coffee beans for context */}
            <div className="absolute top-[10%] right-[10%] w-10 h-10 pointer-events-none z-20 opacity-60">
              <Image src="/images/coffee_bean.png" alt="Coffee bean" fill className="object-contain rotate-12" />
            </div>
            <div className="absolute bottom-[15%] left-[5%] w-12 h-12 pointer-events-none z-20 opacity-60">
              <Image src="/images/coffee_bean.png" alt="Coffee bean" fill className="object-contain -rotate-[45deg]" />
            </div>
          </div>

          {/* Right Column: Checkout Configuration */}
          <div className="lg:col-span-6 flex flex-col justify-center">
            <span className="font-sans text-xs md:text-sm font-semibold tracking-[0.3em] text-[#C4A484] uppercase mb-2">
              Boutique Officielle
            </span>
            <h2 className="font-sans text-4xl md:text-5xl text-[#3D2216] font-black uppercase tracking-tighter mb-4">
              Commander l'Original
            </h2>
            <p className="font-sans text-sm text-[#3D2216]/60 leading-relaxed mb-8 font-light">
              Commandez en ligne et recevez votre tiramisu frais chez vous. Élaboré quotidiennement sur commande par nos maîtres artisans, avec des ingrédients nobles d'une fraîcheur absolue.
            </p>

            {/* Pack Selection List */}
            <div className="flex flex-col gap-4 mb-8">
              {packs.map((pack) => {
                const isSelected = selectedPack === pack.id;
                return (
                  <div
                    key={pack.id}
                    onClick={() => setSelectedPack(pack.id)}
                    className={`relative p-5 rounded-2xl border transition-all duration-350 cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
                      isSelected
                        ? "bg-[#3D2216] text-[#F9F6F0] border-[#3D2216] shadow-md scale-[1.01]"
                        : "bg-[#F9F6F0] text-[#3D2216] border-[#3D2216]/10 hover:border-[#3D2216]/30 shadow-xs"
                    }`}
                  >
                    {/* Badge */}
                    {pack.badge && (
                      <span
                        className={`absolute -top-2.5 right-6 px-2.5 py-0.5 rounded-full font-sans text-[9px] font-semibold uppercase tracking-wider ${
                          isSelected
                            ? "bg-[#C4A484] text-[#F9F6F0]"
                            : "bg-[#3D2216] text-[#F9F6F0]"
                        }`}
                      >
                        {pack.badge}
                      </span>
                    )}

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-sans text-lg md:text-xl font-extrabold uppercase tracking-wide">
                          {pack.name}
                        </h3>
                        <span
                          className={`font-sans text-[10px] uppercase tracking-wider font-light ${
                            isSelected ? "text-[#C4A484]" : "text-[#3D2216]/60"
                          }`}
                        >
                          — {pack.subtitle}
                        </span>
                      </div>
                      <p
                        className={`font-sans text-xs mt-1 font-light ${
                          isSelected ? "text-[#F9F6F0]/80" : "text-[#3D2216]/70"
                        }`}
                      >
                        {pack.desc}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 self-end sm:self-center">
                      <span className="font-sans text-xl md:text-2xl font-extrabold">
                        {pack.price} €
                      </span>
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                          isSelected
                            ? "border-[#F9F6F0] bg-[#F9F6F0]"
                            : "border-[#3D2216]/20 bg-transparent"
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#3D2216]" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quantity Selector */}
            <div className="flex items-center gap-6 mb-8">
              <span className="font-sans text-sm font-semibold text-[#3D2216] uppercase tracking-wider">
                Quantité
              </span>
              <div className="flex items-center bg-[#F9F6F0] border border-[#3D2216]/10 rounded-full py-1.5 px-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[#3D2216]/60 hover:text-[#3D2216] font-bold transition-colors cursor-pointer"
                  disabled={quantity <= 1}
                >
                  -
                </button>
                <span className="w-10 text-center font-sans text-base text-[#3D2216] font-semibold">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[#3D2216]/60 hover:text-[#3D2216] font-bold transition-colors cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            {/* Price & Add to Cart Button */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-6 pt-4 border-t border-[#3D2216]/5">
              <div>
                <span className="font-sans text-xs text-[#3D2216]/50 uppercase tracking-widest block">
                  Total Estimé
                </span>
                <span className="font-sans text-3xl sm:text-4xl text-[#3D2216] font-black">
                  {currentPrice} €
                </span>
              </div>

              <div className="relative flex-1 max-w-sm">
                <button
                  onClick={handleAddToCart}
                  className={`w-full py-4 rounded-full font-sans text-sm font-semibold tracking-widest uppercase flex items-center justify-center gap-3 transition-all duration-300 cursor-pointer ${
                    isAdded
                      ? "bg-green-700 text-white"
                      : "bg-[#3D2216] hover:bg-[#150B07] text-[#F9F6F0] hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                  }`}
                  disabled={isAdding || isAdded}
                >
                  {isAdding ? (
                    <span className="w-5 h-5 border-2 border-[#F9F6F0]/30 border-t-[#F9F6F0] rounded-full animate-spin" />
                  ) : isAdded ? (
                    <>
                      Ajouté avec succès
                      <Check className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      Ajouter au Panier
                      <ShoppingBag className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Success Floating Dialog */}
                {isAdded && (
                  <div
                    ref={successRef}
                    className="absolute -top-14 left-1/2 -translate-x-1/2 bg-[#3D2216] text-[#F9F6F0] text-xs py-2 px-4 rounded-full flex items-center gap-2 whitespace-nowrap shadow-md z-30 border border-[#C4A484]/30"
                  >
                    <Check className="w-3.5 h-3.5 text-[#C4A484]" />
                    Votre tiramisu vous attend dans le panier !
                  </div>
                )}
              </div>
            </div>

            {/* Premium Commitments */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-10 pt-6 border-t border-[#3D2216]/5 text-left">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#3D2216]/5 rounded-lg text-[#3D2216]">
                  <Truck className="w-4 h-4" />
                </div>
                <span className="font-sans text-[11px] text-[#3D2216]/80 font-medium">
                  Livraison Réfrigérée (24h)
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#3D2216]/5 rounded-lg text-[#3D2216]">
                  <Award className="w-4 h-4" />
                </div>
                <span className="font-sans text-[11px] text-[#3D2216]/80 font-medium">
                  100% Artisanal & Fait Main
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#3D2216]/5 rounded-lg text-[#3D2216]">
                  <Info className="w-4 h-4" />
                </div>
                <span className="font-sans text-[11px] text-[#3D2216]/80 font-medium">
                  DLUO : 6 Jours de Fraîcheur
                </span>
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
