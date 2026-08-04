"use client";

import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { useState } from "react";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubscribed(true);
    setEmail("");
    setTimeout(() => setSubscribed(false), 4000);
  };

  return (
    <footer className="w-full bg-[#3D2216] text-[#F9F6F0] py-20 px-6 md:px-12 border-t border-[#150B07]">
      <div className="max-w-7xl mx-auto flex flex-col items-center">
        
        {/* Top Section: Newsletter and Logo */}
        <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-12 items-center mb-16 pb-16 border-b border-[#F9F6F0]/10">
          {/* Logo and Brand Note */}
          <div className="md:col-span-5 flex flex-col items-start text-left">
            <div className="relative w-[220px] h-[66px] md:w-[320px] md:h-[96px] mb-4 brightness-0 invert">
              <Image
                src="/images/logo_brwn.png"
                alt="BRWN Logo"
                fill
                sizes="(max-width: 768px) 220px, 320px"
                quality={85}
                className="object-contain"
              />
            </div>
            <p className="font-sans text-xs md:text-sm text-[#F9F6F0]/70 font-light leading-relaxed max-w-sm">
              L'essence du Tiramisu au Café repensée pour les amateurs d'expériences uniques. Fait main avec passion et minutie.
            </p>
          </div>

          {/* Newsletter subscription */}
          <div className="md:col-span-7 flex flex-col items-start md:items-end text-left md:text-right w-full">
            <span className="font-sans text-xs font-semibold tracking-widest text-[#C4A484] uppercase mb-2">
              Le Club BRWN
            </span>
            <h3 className="font-sans text-xl md:text-2xl font-black uppercase tracking-tight mb-4 text-left md:text-right">
              Inscrivez-vous pour nos éditions limitées
            </h3>
            
            <form onSubmit={handleSubscribe} className="relative w-full max-w-md flex items-center">
              <input
                type="email"
                placeholder="Votre adresse email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#150B07]/30 border border-[#F9F6F0]/10 hover:border-[#F9F6F0]/30 focus:border-[#C4A484] rounded-full py-4 pl-6 pr-14 font-sans text-sm text-[#F9F6F0] outline-hidden transition-colors"
                required
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#C4A484] hover:bg-[#F9F6F0] text-[#3D2216] p-2.5 rounded-full transition-colors cursor-pointer"
                aria-label="S'inscrire"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
            {subscribed && (
              <span className="font-sans text-xs text-[#C4A484] mt-2 block transition-opacity duration-300">
                Bienvenue au club ! Vous recevrez bientôt nos actualités gourmandes.
              </span>
            )}
          </div>
        </div>

        {/* Bottom Section: Links & Copyright */}
        <div className="w-full flex flex-col sm:flex-row justify-between items-center gap-8">
          {/* Socials */}
          <div className="flex gap-6 items-center">
            <a
              href="https://www.instagram.com/brwn.desserts?igsh=ZmxpeTl5dW5hcnhx&utm_source=qr"
              target="_blank"
              rel="noreferrer"
              className="p-2.5 rounded-full border border-[#F9F6F0]/10 hover:border-[#C4A484] hover:text-[#C4A484] transition-colors"
              aria-label="Instagram"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
            </a>
            <a
              href="https://www.facebook.com/profile.php?id=61590778200472&mibextid=wwXIfr&mibextid=wwXIfr"
              target="_blank"
              rel="noreferrer"
              className="p-2.5 rounded-full border border-[#F9F6F0]/10 hover:border-[#C4A484] hover:text-[#C4A484] transition-colors"
              aria-label="Facebook"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
            </a>
            <a
              href="https://www.tiktok.com/@brwn.desserts?_r=1&_t=ZS-98aZsth5cBg"
              target="_blank"
              rel="noreferrer"
              className="p-2.5 rounded-full border border-[#F9F6F0]/10 hover:border-[#C4A484] hover:text-[#C4A484] transition-colors"
              aria-label="TikTok"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" className="w-4 h-4">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 1 1-2.88-2.88c.37 0 .72.07 1.05.2v-3.5a6.37 6.37 0 1 0 5.28 6.26V9.47a8.27 8.27 0 0 0 4.84 1.56V7.57a4.83 4.83 0 0 1-1.07-.88z"/>
              </svg>
            </a>
          </div>

          {/* Nav links */}
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-xs text-[#F9F6F0]/65">
            <a href="#product-hero" className="hover:text-[#F9F6F0] transition-colors">
              Haut de Page
            </a>
            <a href="#deconstruction" className="hover:text-[#F9F6F0] transition-colors">
              La Déconstruction
            </a>
            <a href="#tasting-notes" className="hover:text-[#F9F6F0] transition-colors">
              Ingrédients
            </a>
            <span className="text-[#F9F6F0]/20 hidden sm:inline">|</span>
            <a href="/legal" className="hover:text-[#F9F6F0] transition-colors">
              Mentions Légales
            </a>
            <a href="/contact" className="hover:text-[#F9F6F0] transition-colors">
              Contact : bonjour@brwn.co
            </a>
          </div>

          {/* Copyright */}
          <span className="font-sans text-[10px] text-[#F9F6F0]/40 uppercase tracking-widest">
            © {new Date().getFullYear()} BRWN. TOUS DROITS RÉSERVÉS.
          </span>
        </div>

      </div>
    </footer>
  );
}
