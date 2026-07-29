"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

interface HeroSlide {
  id: string;
  media_type: "image" | "video";
  image_url: string;
  mobile_image_url?: string | null;
  alt_text: string;
  title_text?: string | null;
  aria_label?: string | null;
  position: number;
  crop_data?: { zoom: number; x: number; y: number } | null;
}

interface HeroSettings {
  autoplay_enabled: boolean;
  autoplay_interval_ms: number;
  transition_duration_ms: number;
}

const DEFAULT_SLIDE: HeroSlide = {
  id: "default-1",
  media_type: "image",
  image_url: "/images/hero_background.png",
  alt_text: "Image de couverture originale BRWN Tiramisu",
  title_text: "Le Tiramisu Réinventé par BRWN",
  aria_label: "Carrousel de couverture BRWN",
  position: 1,
  crop_data: { zoom: 1, x: 0, y: 0 },
};

const DEFAULT_SETTINGS: HeroSettings = {
  autoplay_enabled: true,
  autoplay_interval_ms: 6000,
  transition_duration_ms: 700,
};

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

  // Carousel & Settings states
  const [slides, setSlides] = useState<HeroSlide[]>([DEFAULT_SLIDE]);
  const [heroSettings, setHeroSettings] = useState<HeroSettings>(DEFAULT_SETTINGS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // 1. Récupération des slides et options dynamiques depuis l'API publique
  useEffect(() => {
    async function fetchSlidesAndSettings() {
      try {
        const res = await fetch("/api/hero-slides");
        if (res.ok) {
          const data = await res.json();
          if (data.slides && data.slides.length > 0) {
            setSlides(data.slides);
          }
          if (data.settings) {
            setHeroSettings(data.settings);
          }
        }
      } catch {
        // Conserver les valeurs par défaut en cas d'erreur réseau
      }
    }

    fetchSlidesAndSettings();

    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(motionQuery.matches);
    const handleMotionChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    motionQuery.addEventListener("change", handleMotionChange);

    return () => {
      window.removeEventListener("resize", checkMobile);
      motionQuery.removeEventListener("change", handleMotionChange);
    };
  }, []);

  // 2. Défilement automatique dynamique lisant autoplay_enabled et autoplay_interval_ms
  useEffect(() => {
    if (
      slides.length <= 1 ||
      isPaused ||
      prefersReducedMotion ||
      !heroSettings.autoplay_enabled
    ) {
      return;
    }

    const interval = heroSettings.autoplay_interval_ms || 6000;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, interval);

    return () => clearInterval(timer);
  }, [
    slides.length,
    isPaused,
    prefersReducedMotion,
    heroSettings.autoplay_enabled,
    heroSettings.autoplay_interval_ms,
  ]);

  // 3. Animations GSAP (Entièrement préservées)
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
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

      const smallFloaters = [bean1Ref.current, bean2Ref.current, ladyRef.current, cocoaRef.current];
      gsap.fromTo(
        smallFloaters,
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 0.8, duration: 1.2, ease: "power3.out", delay: 0.6, stagger: 0.1 }
      );

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
            },
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
            },
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
            },
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
            },
          });
        }

        if (contentRef.current) {
          gsap.to(contentRef.current, {
            y: 80,
            scrollTrigger: {
              trigger: containerRef.current,
              start: "top top",
              end: "bottom top",
              scrub: true,
            },
          });
        }
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const { clientX, clientY } = e;
    const { width, height, left, top } = containerRef.current.getBoundingClientRect();
    const x = (clientX - left - width / 2) / (width / 2);
    const y = (clientY - top - height / 2) / (height / 2);

    gsap.to(bean1Ref.current, { x: x * 20, y: y * 20, duration: 1.2, ease: "power2.out" });
    gsap.to(bean2Ref.current, { x: -x * 25, y: -y * 25, duration: 1.2, ease: "power2.out" });
    gsap.to(ladyRef.current, { x: -x * 15, y: y * 20, duration: 1.5, ease: "power2.out" });
    gsap.to(cocoaRef.current, { x: x * 25, y: -y * 15, duration: 1.5, ease: "power2.out" });
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  return (
    <section
      id="product-hero"
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative w-full min-h-[calc(100svh-80px)] md:min-h-0 md:h-[70vh] flex flex-col justify-center md:justify-start items-center pt-16 md:pt-24 overflow-hidden px-6 select-none border-b border-[#3D2216]/5"
    >
      {/* 1. CARROUSEL D'IMAGES DE FOND DYNAMIQUE AVEC TRANSITION PERSONNALISEE */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {slides.map((slide, idx) => {
          const isActive = idx === currentIndex;
          const imageUrl = isMobile && slide.mobile_image_url ? slide.mobile_image_url : slide.image_url;

          return (
            <div
              key={slide.id || idx}
              className={`absolute inset-0 transition-opacity ease-in-out ${
                isActive ? "opacity-100 z-1" : "opacity-0 z-0"
              }`}
              style={{
                transitionDuration: `${heroSettings.transition_duration_ms || 700}ms`,
              }}
            >
              {slide.media_type === "video" ? (
                <video
                  src={imageUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <Image
                  src={imageUrl}
                  alt={slide.alt_text || "Image de couverture BRWN"}
                  title={slide.title_text || undefined}
                  aria-label={slide.aria_label || undefined}
                  fill
                  priority={idx === 0}
                  sizes="100vw"
                  className="object-cover"
                  style={{
                    transform: slide.crop_data
                      ? `scale(${slide.crop_data.zoom || 1}) translate(${slide.crop_data.x || 0}px, ${slide.crop_data.y || 0}px)`
                      : undefined,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Semi-transparent tint overlay (Préservé) */}
      <div className="absolute inset-0 bg-[#FAF7F2]/80 backdrop-blur-[1px] pointer-events-none z-2" />

      {/* Background Palm Leaf Shadow Pattern (Préservé) */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay z-3"
        style={{
          backgroundImage: "radial-gradient(#3D2216 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Intermediate Parallax Ingredients (Préservé) */}
      <div
        ref={bean1Ref}
        className="absolute top-[15%] left-[20%] md:left-[25%] w-10 h-10 md:w-16 md:h-16 pointer-events-none z-5 opacity-70 filter drop-shadow-md"
      >
        <Image src="/images/coffee_bean.png" alt="Coffee bean" fill sizes="64px" className="object-contain rotate-45" />
      </div>

      <div
        ref={bean2Ref}
        className="absolute bottom-[20%] left-[15%] md:left-[20%] w-12 h-12 md:w-20 md:h-20 pointer-events-none z-5 opacity-70 filter drop-shadow-lg"
      >
        <Image src="/images/coffee_bean.png" alt="Coffee bean" fill sizes="80px" className="object-contain -rotate-12" />
      </div>

      <div
        ref={ladyRef}
        className="absolute bottom-[18%] right-[15%] md:right-[20%] w-24 h-12 md:w-44 md:h-22 pointer-events-none z-5 opacity-60 filter drop-shadow-xl"
      >
        <Image src="/images/ladyfinger.png" alt="Savoiardi Ladyfinger" fill sizes="176px" className="object-contain rotate-[35deg]" />
      </div>

      <div
        ref={cocoaRef}
        className="absolute top-[20%] right-[18%] md:right-[22%] w-20 h-20 md:w-32 md:h-32 pointer-events-none z-5 opacity-30 blur-xs"
      >
        <Image src="/images/cocoa_dust.png" alt="Cocoa splash" fill sizes="128px" className="object-contain" />
      </div>

      {/* Central Content (Préservé à 100%) */}
      <div
        ref={contentRef}
        className="relative max-w-4xl w-full flex flex-col items-center text-center z-20 px-4 gap-4 md:gap-0"
      >
        <h1
          ref={titleRef}
          className="font-sans font-extrabold text-[#150B07] text-3xl sm:text-5xl md:text-[4.5vw] tracking-tighter leading-[1.15] uppercase"
        >
          Le Tiramisu Réinventé
        </h1>

        <p
          ref={subtitleRef}
          className="font-sans text-[#3D2216]/80 text-sm sm:text-lg md:text-xl font-light tracking-wide max-w-xl sm:max-w-2xl mt-0 md:mt-6 leading-relaxed"
        >
          Le premier tiramisu gastronomique au café de spécialité fait son entrée officielle au menu.
        </p>

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

      {/* Flèches de navigation discrètes */}
      {slides.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            aria-label="Image précédente"
            className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 p-3 bg-white/70 hover:bg-white text-[#3D2216] rounded-full shadow-md backdrop-blur-xs transition-all duration-300 z-30 hover:scale-110 active:scale-95 cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleNext}
            aria-label="Image suivante"
            className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 p-3 bg-white/70 hover:bg-white text-[#3D2216] rounded-full shadow-md backdrop-blur-xs transition-all duration-300 z-30 hover:scale-110 active:scale-95 cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Indicateurs de points */}
      {slides.length > 1 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2.5 z-30">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Aller à l'image ${idx + 1}`}
              className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                currentIndex === idx
                  ? "bg-[#3D2216] w-7 shadow-xs"
                  : "bg-[#3D2216]/40 hover:bg-[#3D2216]/70 w-2.5"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
