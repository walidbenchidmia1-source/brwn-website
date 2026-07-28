"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Thermometer, RefreshCw, Layers } from "lucide-react";

export default function Rituel() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const items = gsap.utils.toArray(".rituel-step");
      gsap.fromTo(
        items,
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: "power2.out",
          stagger: 0.2,
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

  const steps = [
    {
      icon: <Thermometer className="w-6 h-6 text-[#F9F6F0]" />,
      step: "01",
      title: "La Température Idéale",
      desc: "Conservez votre tiramisu au réfrigérateur à 4°C. Sortez-le exactement 3 minutes avant dégustation pour que la mascarpone retrouve son onctuosité soyeuse sans s'affaisser.",
    },
    {
      icon: <Layers className="w-6 h-6 text-[#F9F6F0]" />,
      step: "02",
      title: "La Cuillère Verticale",
      desc: "Ne mélangez jamais. Plongez votre cuillère verticalement du haut vers le bas afin d'obtenir la proportion parfaite de cacao, de crème et de biscuit imbibé dans une seule bouchée.",
    },
    {
      icon: <RefreshCw className="w-6 h-6 text-[#F9F6F0]" />,
      step: "03",
      title: "L'Accord Parfait",
      desc: "Savourez-le accompagné d'un café filtre léger de spécialité (méthode V60) aux notes fruitées, ou prolongez la soirée avec un verre de cognac vieilli ou un whisky Single Malt tourbé.",
    },
  ];

  return (
    <section
      id="rituel"
      ref={containerRef}
      className="relative w-full bg-[#FAF7F2] py-24 px-6 md:px-12 border-t border-b border-[#3D2216]/5"
    >
      <div className="max-w-7xl mx-auto text-center">
        {/* Header */}
        <span className="font-sans text-xs md:text-sm font-semibold tracking-[0.3em] text-[#C4A484] uppercase">
          L'Art de Déguster
        </span>
        <h2 className="font-sans text-4xl md:text-5xl text-[#3D2216] font-black uppercase tracking-tighter mt-2 mb-4">
          Le Rituel BRWN
        </h2>
        <p className="font-sans text-sm text-[#3D2216]/60 max-w-xl mx-auto mb-16 font-light">
          Pour apprécier pleinement la complexité des saveurs de notre Tiramisu Original, suivez notre guide de dégustation rituel.
        </p>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          {steps.map((item, index) => (
            <div
              key={index}
              className="rituel-step relative bg-[#F9F6F0] p-8 rounded-3xl border border-[#3D2216]/5 hover:shadow-lg transition-shadow duration-300 flex flex-col cursor-default"
            >
              {/* Step Number and Icon */}
              <div className="flex justify-between items-center mb-8">
                <span className="font-sans text-4xl font-black text-[#C4A484]/40">
                  {item.step}
                </span>
                <div className="p-3 bg-[#3D2216] rounded-xl flex items-center justify-center">
                  {item.icon}
                </div>
              </div>

              {/* Title */}
              <h3 className="font-sans text-lg text-[#3D2216] font-extrabold uppercase tracking-wide mb-3">
                {item.title}
              </h3>
              
              {/* Description */}
              <p className="font-sans text-xs md:text-sm text-[#3D2216]/75 leading-relaxed font-light mt-auto">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
