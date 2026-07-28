"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Coffee, Shell, Leaf, Flame } from "lucide-react";

export default function TastingNotes() {
  const containerRef = useRef<HTMLDivElement>(null);
  const barsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      // Animate progress bars on entering viewport
      const bars = gsap.utils.toArray(".taste-bar-fill");
      gsap.fromTo(
        bars,
        { width: "0%" },
        {
          width: (i, target: any) => target.getAttribute("data-width") || "0%",
          duration: 1.5,
          ease: "power3.out",
          stagger: 0.2,
          scrollTrigger: {
            trigger: barsRef.current,
            start: "top 80%",
            toggleActions: "play none none reverse",
          },
        }
      );

      // Fade-in cards
      const cards = gsap.utils.toArray(".ingredient-card");
      gsap.fromTo(
        cards,
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          ease: "power2.out",
          stagger: 0.15,
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 75%",
            toggleActions: "play none none reverse",
          },
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const profiles = [
    { label: "Intensité du Café", value: "85%", desc: "Espresso de spécialité corsé" },
    { label: "Onctuosité de la Crème", value: "90%", desc: "Mascarpone double crème velouté" },
    { label: "Amertume du Cacao", value: "65%", desc: "Cacao hollandais brut balancé" },
    { label: "Douceur Sucrée", value: "45%", desc: "Sucre de canne blond léger" },
  ];

  const ingredients = [
    {
      icon: <Coffee className="w-6 h-6 text-[#C4A484]" />,
      name: "Espresso Single-Origin",
      origin: "Éthiopie Sidama",
      desc: "Torréfié délicatement pour exprimer des notes naturelles de fruits rouges et de chocolat noir. Extraction courte pour une puissance aromatique maximale.",
    },
    {
      icon: <Shell className="w-6 h-6 text-[#C4A484]" />,
      name: "Mascarpone Frais",
      origin: "Lombardie, Italie",
      desc: "Élaboré avec de la crème fraîche locale de vache. Un taux de matière grasse idéal garantissant une onctuosité et une tenue inégalées.",
    },
    {
      icon: <Leaf className="w-6 h-6 text-[#C4A484]" />,
      name: "Cacao en Poudre",
      origin: "Pays-Bas (Dutch-Process)",
      desc: "Un cacao alcalinisé de qualité supérieure, révélant une robe sombre et des arômes ronds, sans acidité excessive, parfait pour contraster la crème.",
    },
    {
      icon: <Flame className="w-6 h-6 text-[#C4A484]" />,
      name: "Vanille Bourbon",
      origin: "Sava, Madagascar",
      desc: "Gousses charnues infusées lentement dans la crème. Des notes boisées et caramélisées qui subliment le mélange mascarpone-œuf.",
    },
  ];

  return (
    <section
      id="tasting-notes"
      ref={containerRef}
      className="relative w-full bg-[#F9F6F0] py-24 px-6 md:px-12"
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          
          {/* Left Column: Taste Profile */}
          <div className="lg:col-span-5 flex flex-col justify-center">
            <span className="font-sans text-xs md:text-sm font-semibold tracking-[0.3em] text-[#C4A484] uppercase mb-2">
              Profil Aromatique
            </span>
            <h2 className="font-sans text-4xl md:text-5xl text-[#3D2216] font-black uppercase tracking-tighter mb-6">
              L'Équilibre Idéal
            </h2>
            <p className="font-sans text-sm text-[#3D2216]/75 leading-relaxed font-light mb-10">
              Le BRWN Original Coffee Tiramisu est le fruit de dizaines d'essais. Chaque ingrédient est dosé pour créer une synergie parfaite en bouche : l'attaque franche du café, enveloppée par la rondeur de la mascarpone, couronnée par l'amertume poudrée du cacao.
            </p>

            {/* Progress Bars Container */}
            <div ref={barsRef} className="flex flex-col gap-6 w-full">
              {profiles.map((profile, index) => (
                <div key={index} className="flex flex-col">
                  <div className="flex justify-between items-end mb-2">
                    <div>
                      <span className="font-sans text-sm font-semibold text-[#3D2216]">
                        {profile.label}
                      </span>
                      <span className="font-sans text-xs text-[#3D2216]/50 block">
                        {profile.desc}
                      </span>
                    </div>
                    <span className="font-sans text-lg font-bold text-[#C4A484]">
                      {profile.value}
                    </span>
                  </div>
                  {/* Bar Background */}
                  <div className="w-full h-1 bg-[#3D2216]/10 rounded-full overflow-hidden">
                    {/* Bar Fill */}
                    <div
                      className="taste-bar-fill h-full bg-[#3D2216] rounded-full"
                      data-width={profile.value}
                      style={{ width: "0%" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Key Ingredients */}
          <div className="lg:col-span-7">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {ingredients.map((ing, index) => (
                <div
                  key={index}
                  className="ingredient-card bg-[#FAF7F2] p-8 rounded-3xl border border-[#3D2216]/5 shadow-xs hover:border-[#C4A484]/30 hover:shadow-md transition-all duration-350 flex flex-col group cursor-default"
                >
                  <div className="p-3 bg-[#F9F6F0] rounded-2xl w-fit mb-6 border border-[#3D2216]/5 transition-transform group-hover:scale-105">
                    {ing.icon}
                  </div>
                  <h3 className="font-sans text-lg text-[#3D2216] font-extrabold uppercase tracking-wide mb-1">
                    {ing.name}
                  </h3>
                  <span className="font-sans text-xs text-[#C4A484] uppercase tracking-wider font-semibold mb-4 block">
                    Provenance : {ing.origin}
                  </span>
                  <p className="font-sans text-xs md:text-sm text-[#3D2216]/70 leading-relaxed font-light">
                    {ing.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
