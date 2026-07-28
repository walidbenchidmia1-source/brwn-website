"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight } from "lucide-react";

export default function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  // Floating elements refs
  const bean1Ref = useRef<HTMLDivElement>(null);
  const bean2Ref = useRef<HTMLDivElement>(null);
  const ladyRef = useRef<HTMLDivElement>(null);
  const cocoaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      // 1. Central content entry animations
      gsap.fromTo(
        titleRef.current,
        { y: 80, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.2, ease: "power4.out", delay: 0.2 }
      );

      gsap.fromTo(
        subtitleRef.current,
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, ease: "power3.out", delay: 0.5 }
      );

      gsap.fromTo(
        buttonRef.current,
        { scale: 0.8, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.8, ease: "back.out(1.7)", delay: 0.8 }
      );

      // 2. Small floaters entry
      const smallFloaters = [bean1Ref.current, bean2Ref.current, ladyRef.current, cocoaRef.current];
      gsap.fromTo(
        smallFloaters,
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 0.8, duration: 1.2, ease: "power3.out", delay: 0.6, stagger: 0.1 }
      );

      // 3. Idle floating animations
      smallFloaters.forEach((el, idx) => {
        if (!el) return;
        gsap.to(el, {
          y: `${idx % 2 === 0 ? "-" : "+"}=15`,
          x: `${idx % 3 === 0 ? "+" : "-"}=10`,
          rotation: `${idx % 2 === 0 ? "+" : "-"}=10`,
          duration: 4 + idx,
          ease: "power1.inOut",
          yoyo: true,
          repeat: -1,
        });
      });

      // 4. Scroll-triggered Parallax for small elements & text (Desktop/Tablet only)
      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px)", () => {
        if (bean1Ref.current) {
          gsap.to(bean1Ref.current, {
            y: -150,
            rotation: 45,
            scrollTrigger: {
              trigger: containerRef.current,
              start: "top top",
              end: "bottom top",
              scrub: true,
            }
          });
        }

        if (bean2Ref.current) {
          gsap.to(bean2Ref.current, {
            y: -250,
            rotation: -45,
            scrollTrigger: {
              trigger: containerRef.current,
              start: "top top",
              end: "bottom top",
              scrub: true,
            }
          });
        }

        if (ladyRef.current) {
          gsap.to(ladyRef.current, {
            y: -200,
            rotation: 30,
            scrollTrigger: {
              trigger: containerRef.current,
              start: "top top",
              end: "bottom top",
              scrub: true,
            }
          });
        }

        if (cocoaRef.current) {
          gsap.to(cocoaRef.current, {
            y: -120,
            scale: 1.15,
            scrollTrigger: {
              trigger: containerRef.current,
              start: "top top",
              end: "bottom top",
              scrub: true,
            }
          });
        }

        // Central texts parallax
        if (contentRef.current) {
          gsap.to(contentRef.current, {
            y: 80,
            scrollTrigger: {
              trigger: containerRef.current,
              start: "top top",
              end: "bottom top",
              scrub: true,
            }
          });
        }
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  // Subtle Mouse-move interaction for visual depth
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const { clientX, clientY } = e;
    const { width, height, left, top } = containerRef.current.getBoundingClientRect();
    const x = (clientX - left - width / 2) / (width / 2);
    const y = (clientY - top - height / 2) / (height / 2);

    // Apply mouse drift to floating elements
    gsap.to(bean1Ref.current, { x: x * 20, y: y * 20, duration: 1.2, ease: "power2.out" });
    gsap.to(bean2Ref.current, { x: -x * 25, y: -y * 25, duration: 1.2, ease: "power2.out" });
    gsap.to(ladyRef.current, { x: -x * 15, y: y * 20, duration: 1.5, ease: "power2.out" });
    gsap.to(cocoaRef.current, { x: x * 25, y: -y * 15, duration: 1.5, ease: "power2.out" });
  };



  return (
    <section
      id="product-hero"
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative w-full min-h-[calc(100svh-80px)] md:min-h-0 md:h-[70vh] flex flex-col justify-center md:justify-start items-center pt-16 md:pt-24 overflow-hidden px-6 select-none border-b border-[#3D2216]/5"
      style={{
        backgroundImage: "url('/images/hero_background.png')",
        backgroundSize: "cover",
        backgroundPosition: "center"
      }}
    >
      {/* Semi-transparent tint overlay to ensure high text readability and premium aesthetic */}
      <div className="absolute inset-0 bg-[#FAF7F2]/80 backdrop-blur-[1px] pointer-events-none" />

      {/* Background Palm Leaf Shadow Pattern (Subtle overlay matching reference image style) */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: "radial-gradient(#3D2216 1px, transparent 1px)",
          backgroundSize: "24px 24px"
        }}
      />

      {/* Intermediate Parallax Ingredients */}
      {/* Coffee Bean 1 (Top Center) */}
      <div
        ref={bean1Ref}
        className="absolute top-[15%] left-[20%] md:left-[25%] w-10 h-10 md:w-16 md:h-16 pointer-events-none z-5 opacity-70 filter drop-shadow-md"
      >
        <Image src="/images/coffee_bean.png" alt="Coffee bean" fill sizes="64px" className="object-contain rotate-45" />
      </div>

      {/* Coffee Bean 2 (Bottom Left) */}
      <div
        ref={bean2Ref}
        className="absolute bottom-[20%] left-[15%] md:left-[20%] w-12 h-12 md:w-20 md:h-20 pointer-events-none z-5 opacity-70 filter drop-shadow-lg"
      >
        <Image src="/images/coffee_bean.png" alt="Coffee bean" fill sizes="80px" className="object-contain -rotate-12" />
      </div>

      {/* Ladyfinger Biscuit (Bottom Right-Center) */}
      <div
        ref={ladyRef}
        className="absolute bottom-[18%] right-[15%] md:right-[20%] w-24 h-12 md:w-44 md:h-22 pointer-events-none z-5 opacity-60 filter drop-shadow-xl"
      >
        <Image src="/images/ladyfinger.png" alt="Savoiardi Ladyfinger" fill sizes="176px" className="object-contain rotate-[35deg]" />
      </div>

      {/* Cocoa Powder Cloud (Top Right) */}
      <div
        ref={cocoaRef}
        className="absolute top-[20%] right-[18%] md:right-[22%] w-20 h-20 md:w-32 md:h-32 pointer-events-none z-5 opacity-30 blur-xs"
      >
        <Image src="/images/cocoa_dust.png" alt="Cocoa splash" fill sizes="128px" className="object-contain" />
      </div>

      {/* Central Content (Matches Crumbl layout) */}
      <div 
        ref={contentRef}
        className="relative max-w-4xl w-full flex flex-col items-center text-center z-20 px-4 gap-4 md:gap-0"
      >
        {/* Title: Large, bold, impactful (Outfit Serif blend) */}
        <h1
          ref={titleRef}
          className="font-sans font-extrabold text-[#150B07] text-3xl sm:text-5xl md:text-[4.5vw] tracking-tighter leading-[1.15] uppercase"
        >
          Le Tiramisu Réinventé
        </h1>

        {/* Subtitle */}
        <p
          ref={subtitleRef}
          className="font-sans text-[#3D2216]/80 text-sm sm:text-lg md:text-xl font-light tracking-wide max-w-xl sm:max-w-2xl mt-0 md:mt-6 leading-relaxed"
        >
          Le premier tiramisu gastronomique au café de spécialité fait son entrée officielle au menu.
        </p>

        {/* Central CTA Button (Black Pill, matches Crumbl layout) */}
        <button
          ref={buttonRef}
          onClick={() => {
            document.getElementById("deconstruction")?.scrollIntoView({ behavior: "smooth" });
          }}
          className="mt-0 md:mt-8 px-10 py-4 bg-[#150B07] hover:bg-[#3D2216] text-[#F9F6F0] font-sans text-xs md:text-sm font-semibold tracking-widest uppercase rounded-full shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2"
        >
          Commander l'Original
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Removed dots indicator to avoid overlap since slider is no longer active */}
    </section>
  );
}
