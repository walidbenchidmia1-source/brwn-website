"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ShoppingBag, Menu, X } from "lucide-react";
import { useCart } from "@/context/CartContext";
import CartDrawer from "@/components/CartDrawer";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { totalItems, isMounted } = useCart();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    setIsMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 flex items-center ${
          isScrolled
            ? "h-16 md:h-20 bg-[#EADDC9]/95 backdrop-blur-md border-b border-[#3D2216]/15 shadow-sm"
            : "h-20 md:h-26 bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto w-full px-6 md:px-12 flex items-center justify-between relative">
          
          {/* Menu button on the left (matches Crumbl) */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex items-center gap-2 text-[#3D2216] focus:outline-hidden cursor-pointer select-none transition-transform hover:scale-105"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            <span className="font-sans text-sm font-semibold tracking-wider uppercase hidden sm:inline">
              Menu
            </span>
          </button>

          {/* Logo centered (matches Crumbl) */}
          <div
            className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-500 cursor-pointer select-none hover:scale-105 ${
              isScrolled
                ? "w-[160px] h-[48px] md:w-[240px] md:h-[72px]"
                : "w-[220px] h-[66px] md:w-[320px] md:h-[96px]"
            }`}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <Image
              src="/images/logo_brwn.png"
              alt="BRWN Logo"
              fill
              className="object-contain"
              priority
            />
          </div>

          {/* Shopping / CTA on the right */}
          <div className="flex items-center gap-4">
            {/* Cart Button with numerical badge */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2.5 hover:bg-[#3D2216]/5 text-[#3D2216] rounded-full transition-all cursor-pointer flex items-center justify-center"
              aria-label="Voir le panier"
            >
              <ShoppingBag className="w-5 h-5" />
              {isMounted && totalItems > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-[#C83E4D] text-[#F9F6F0] text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border border-[#F9F6F0] shadow-xs">
                  {totalItems}
                </span>
              )}
            </button>
            
            {/* "Commander" shortcut button to scroll to products list */}
            <button
              onClick={() => scrollToSection("deconstruction")}
              className="hidden md:flex px-6 py-2.5 bg-[#3D2216] hover:bg-[#150B07] text-[#F9F6F0] font-sans text-xs font-semibold tracking-widest uppercase rounded-full shadow-xs transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer items-center gap-1.5"
            >
              Commander
            </button>
          </div>

        </div>
      </nav>

      {/* Slide-out Menu (left aligned drawer matching the menu button position) */}
      <div
        className={`fixed inset-0 z-40 bg-[#F9F6F0]/95 backdrop-blur-sm flex flex-col justify-center px-12 transition-transform duration-500 ease-in-out md:max-w-md border-r border-[#3D2216]/10 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Close Button Inside Drawer */}
        <button
          onClick={() => setIsMobileMenuOpen(false)}
          className="absolute top-6 left-6 flex items-center gap-2 text-[#3D2216] cursor-pointer"
        >
          <X className="w-6 h-6" />
          <span className="font-sans text-sm font-semibold tracking-wider uppercase">Fermer</span>
        </button>

        <div className="flex flex-col gap-8 text-left mt-8">
          {["Accueil", "La Recette"].map((item, idx) => {
            const ids = ["product-hero", "deconstruction"];
            return (
              <button
                key={idx}
                onClick={() => scrollToSection(ids[idx])}
                className="font-sans text-2xl font-black uppercase tracking-wider text-[#3D2216] hover:text-[#C4A484] transition-colors w-fit text-left cursor-pointer"
              >
                {item}
              </button>
            );
          })}
          
          <div className="h-px bg-[#3D2216]/10 my-4" />
          
          <button
            onClick={() => scrollToSection("order")}
            className="flex items-center justify-center gap-3 w-full py-4 bg-[#3D2216] hover:bg-[#150B07] text-[#F9F6F0] font-sans text-sm font-semibold tracking-widest uppercase rounded-full transition-all duration-300 cursor-pointer"
          >
            Commander l'Original
            <ShoppingBag className="w-4 h-4" />
          </button>
        </div>
      </div>

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}
