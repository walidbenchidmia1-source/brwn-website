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
  subtitle_text?: string | null;
  button_text?: string | null;
  aria_label?: string | null;
  position: number;
  crop_data?: { zoom: number; x: number; y: number } | null;
  show_title?: boolean;
}

interface HeroSettings {
  autoplay_enabled: boolean;
  autoplay_interval_ms: number;
  transition_duration_ms: number;
}

interface HeroProps {
  initialSlides?: HeroSlide[];
  initialSettings?: HeroSettings;
}

gsap.registerPlugin(ScrollTrigger);

const DEFAULT_SLIDE: HeroSlide = {
  id: "default-1",
  media_type: "image",
  image_url: "/images/hero_background.png",
  mobile_image_url: null,
  alt_text: "BRWN Tiramisu Gastronomique - Image de couverture",
  title_text: "Le Tiramisu Réinventé",
  subtitle_text: "Le premier tiramisu gastronomique au café de spécialité fait son entrée officielle au menu.",
  button_text: "Commander l'Original",
  aria_label: "Carrousel de couverture BRWN",
  position: 1,
  crop_data: { zoom: 1, x: 0, y: 0 },
};

const DEFAULT_SETTINGS: HeroSettings = {
  autoplay_enabled: true,
  autoplay_interval_ms: 6000,
  transition_duration_ms: 700,
};

export default function Hero({ initialSlides, initialSettings }: HeroProps) {
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

  // Initialisation immédiate avec les données serveur (évite le flash de 1s)
  const [slides, setSlides] = useState<HeroSlide[]>(() => {
    return initialSlides && initialSlides.length > 0 ? initialSlides : [DEFAULT_SLIDE];
  });
  const [heroSettings, setHeroSettings] = useState<HeroSettings>(() => {
    return initialSettings || DEFAULT_SETTINGS;
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Synchroniser si les props initiales changent
  useEffect(() => {
    if (initialSlides && initialSlides.length > 0) {
      setSlides(initialSlides);
    }
    if (initialSettings) {
      setHeroSettings(initialSettings);
    }
  }, [initialSlides, initialSettings]);

  // Récupération de secours / mise à jour côté client
  useEffect(() => {
    async function fetchSlidesAndSettings() {
      try {
        const res = await fetch("/api/hero-slides", { cache: "no-store" });
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
        // Conserver les valeurs actuelles en cas d'erreur réseau
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

  // Défilement automatique dynamique lisant autoplay_enabled et autoplay_interval_ms
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
  }, [slides.length, isPaused, prefersReducedMotion, heroSettings]);

  // GSAP Animations
  useEffect(() => {
    const ctx = gsap.context(() => {
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
      {/* 1. CARROUSEL D'IMAGES DE FOND DYNAMIQUE */}
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
                  quality={95}
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

      {/* Background Palm Leaf Shadow Pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 mix-blend-overlay z-3"
        style={{
          backgroundImage: `radial-gradient(circle at 50% 50%, rgba(217, 119, 6, 0.08) 0%, transparent 60%)`,
        }}
      />

      {/* Floating Elements (Préservés à 100%) */}
      <div
        ref={bean1Ref}
        className="absolute top-[15%] left-[8%] md:left-[12%] w-12 h-12 md:w-16 md:h-16 pointer-events-none z-10"
      >
        <Image src="/images/coffee_bean.png" alt="Coffee bean" fill sizes="64px" className="object-contain" />
      </div>

      <div
        ref={bean2Ref}
        className="absolute bottom-[20%] right-[10%] md:right-[15%] w-10 h-10 md:w-14 md:h-14 pointer-events-none z-10"
      >
        <Image src="/images/coffee_bean.png" alt="Coffee bean" fill sizes="56px" className="object-contain" />
      </div>

      <div
        ref={ladyRef}
        className="absolute top-[35%] left-[5%] md:left-[8%] w-14 h-14 md:w-20 md:h-20 pointer-events-none z-10"
      >
        <Image src="/images/ladyfinger.png" alt="Ladyfinger biscuit" fill sizes="80px" className="object-contain" />
      </div>

      <div
        ref={cocoaRef}
        className="absolute top-[20%] right-[18%] md:right-[22%] w-20 h-20 md:w-32 md:h-32 pointer-events-none z-5 opacity-30 blur-xs"
      >
        <Image src="/images/cocoa_dust.png" alt="Cocoa splash" fill sizes="128px" className="object-contain" />
      </div>

      {/* Central Content (Modifiable depuis le Dashboard Admin) */}
      {(() => {
        const currentSlide = slides[currentIndex % slides.length] || slides[0];
        return (
          <div
            ref={contentRef}
            className="relative max-w-4xl w-full flex flex-col items-center text-center z-20 px-4 gap-4 md:gap-0"
          >
            {currentSlide?.show_title !== false && (
              <h1
                ref={titleRef}
                className="font-sans font-extrabold text-[#150B07] text-3xl sm:text-5xl md:text-[4.5vw] tracking-tighter leading-[1.15] uppercase transition-all duration-500"
              >
                {currentSlide?.title_text || "Le Tiramisu Réinventé"}
              </h1>
            )}

            <p
              ref={subtitleRef}
              className="font-sans text-[#3D2216]/80 text-sm sm:text-lg md:text-xl font-light tracking-wide max-w-xl sm:max-w-2xl mt-0 md:mt-6 leading-relaxed transition-all duration-500"
            >
              {currentSlide?.subtitle_text || "Le premier tiramisu gastronomique au café de spécialité fait son entrée officielle au menu."}
            </p>

            <button
              ref={buttonRef}
              onClick={() => {
                document.getElementById("deconstruction")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="mt-0 md:mt-8 px-10 py-4 bg-[#150B07] hover:bg-[#3D2216] text-[#F9F6F0] font-sans text-xs md:text-sm font-semibold tracking-widest uppercase rounded-full shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2"
            >
              {currentSlide?.button_text || "Commander l'Original"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        );
      })()}

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
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-30">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              aria-label={`Aller à l'image ${i + 1}`}
              className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                currentIndex === i ? "bg-[#3D2216] w-8" : "bg-[#3D2216]/30 w-2.5 hover:bg-[#3D2216]/60"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
