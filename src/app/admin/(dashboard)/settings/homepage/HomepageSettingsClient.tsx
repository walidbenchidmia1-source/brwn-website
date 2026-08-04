"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Upload,
  Trash2,
  Eye,
  GripVertical,
  RotateCcw,
  Sparkles,
  Save,
  Smartphone,
  Monitor,
  ZoomIn,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Video,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Sliders,
  Timer,
  Type,
  AlignLeft
} from "lucide-react";

interface HeroSlide {
  id: string;
  media_type: "image" | "video";
  image_path: string;
  image_url: string;
  mobile_image_path?: string | null;
  mobile_image_url?: string | null;
  previous_image_path?: string | null;
  previous_image_url?: string | null;
  previous_mobile_image_path?: string | null;
  previous_mobile_image_url?: string | null;
  alt_text: string;
  title_text?: string | null;
  subtitle_text?: string | null;
  button_text?: string | null;
  aria_label?: string | null;
  position: number;
  is_active: boolean;
  file_size_bytes?: number | null;
  file_format?: string | null;
  crop_data?: { zoom: number; x: number; y: number } | null;
  show_title?: boolean;
  show_subtitle?: boolean;
}

interface HeroSettings {
  id: string;
  autoplay_enabled: boolean;
  autoplay_interval_ms: number;
  transition_duration_ms: number;
}

interface Props {
  initialSlides: HeroSlide[];
  initialSettings: HeroSettings;
}

export default function HomepageSettingsClient({ initialSlides, initialSettings }: Props) {
  const [slides, setSlides] = useState<HeroSlide[]>(() => {
    const map = new Map(initialSlides.map((s) => [s.position, s]));
    const result: HeroSlide[] = [];
    for (let pos = 1; pos <= 3; pos++) {
      if (map.has(pos)) {
        result.push(map.get(pos)!);
      } else {
        result.push({
          id: `temp-${pos}`,
          media_type: "image",
          image_path: "",
          image_url: "/images/hero_background.png",
          alt_text: "Image de couverture BRWN",
          title_text: "Le Tiramisu Réinventé",
          subtitle_text: "Le premier tiramisu gastronomique au café de spécialité fait son entrée officielle au menu.",
          button_text: "Commander l'Original",
          aria_label: `Slide ${pos} - Image de couverture`,
          position: pos,
          is_active: pos === 1,
          crop_data: { zoom: 1, x: 0, y: 0 },
        });
      }
    }
    return result;
  });

  const [heroSettings, setHeroSettings] = useState<HeroSettings>(initialSettings);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);

  // Modale Recadrage
  const [croppingSlideIndex, setCroppingSlideIndex] = useState<number | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropX, setCropX] = useState(0);
  const [cropY, setCropY] = useState(0);

  // Drag & drop
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const triggerAlert = (msg: string, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setMessage(null);
    } else {
      setMessage(msg);
      setErrorMsg(null);
    }
    setTimeout(() => {
      setMessage(null);
      setErrorMsg(null);
    }, 4500);
  };

  // Optimisation Canvas -> WebP
  const processAndOptimizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (file.type.startsWith("video/")) {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          const MAX_SIZE = 2560;
          if (width > MAX_SIZE || height > MAX_SIZE) {
            if (width > height) {
              height = Math.round((height * MAX_SIZE) / width);
              width = MAX_SIZE;
            } else {
              width = Math.round((width * MAX_SIZE) / height);
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const webpData = canvas.toDataURL("image/webp", 0.9);
            resolve(webpData);
          } else {
            resolve(e.target?.result as string);
          }
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Upload d'image (Desktop ou Mobile)
  const handleFileUpload = async (index: number, file: File, isMobile = false) => {
    if (file.size > 8388608) {
      triggerAlert("La taille du fichier dépasse la limite de 8 Mo.", true);
      return;
    }

    setIsLoading(true);
    try {
      const optimizedBase64 = await processAndOptimizeImage(file);
      const isVideo = file.type.startsWith("video/");
      const currentSlide = slides[index];

      const res = await fetch("/api/admin/hero-slides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upload",
          slideId: currentSlide.id.startsWith("temp-") ? null : currentSlide.id,
          position: currentSlide.position,
          media_type: isVideo ? "video" : "image",
          base64Data: optimizedBase64,
          isMobile,
          alt_text: currentSlide.alt_text,
          title_text: currentSlide.title_text,
          subtitle_text: currentSlide.subtitle_text,
          button_text: currentSlide.button_text,
          aria_label: currentSlide.aria_label,
          is_active: currentSlide.is_active,
          crop_data: currentSlide.crop_data,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Échec du téléversement");
      }

      setSlides((prev) => {
        const copy = [...prev];
        copy[index] = data.slide;
        return copy;
      });

      triggerAlert(isMobile ? "Image mobile enregistrée !" : "Image desktop enregistrée !");
    } catch (err: any) {
      triggerAlert(err.message || "Erreur de téléversement", true);
    } finally {
      setIsLoading(false);
    }
  };

  // Restauration de l'image précédente
  const handleRestore = async (index: number, isMobile = false) => {
    const currentSlide = slides[index];
    if (currentSlide.id.startsWith("temp-")) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/hero-slides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "restore",
          slideId: currentSlide.id,
          isMobile,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Échec de la restauration");
      }

      setSlides((prev) => {
        const copy = [...prev];
        copy[index] = data.slide;
        return copy;
      });

      triggerAlert("Image précédente restaurée avec succès !");
    } catch (err: any) {
      triggerAlert(err.message || "Erreur de restauration", true);
    } finally {
      setIsLoading(false);
    }
  };

  // Basculer active/inactive avec sauvegarde garantie par position
  const handleToggleActive = async (index: number) => {
    const target = slides[index];
    const newActive = !target.is_active;

    setSlides((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], is_active: newActive };
      return copy;
    });

    try {
      const res = await fetch("/api/admin/hero-slides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slideId: target.id.startsWith("temp-") ? null : target.id,
          position: target.position,
          is_active: newActive,
          image_url: target.image_url,
          title_text: target.title_text,
          subtitle_text: target.subtitle_text,
          button_text: target.button_text,
          alt_text: target.alt_text,
        }),
      });
      const data = await res.json();
      if (data.slide) {
        setSlides((prev) => {
          const copy = [...prev];
          copy[index] = data.slide;
          return copy;
        });
      }
    } catch {
      // Échec silencieux
    }
  };

  // Métadonnées SEO et Textes
  const handleMetadataChange = (index: number, field: string, value: any) => {
    setSlides((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Sauvegarder les paramètres globaux (Autoplay, Intervalle, Transition)
  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/hero-slides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_settings",
          heroSettings,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Échec de la mise à jour des options");

      setHeroSettings(data.settings);
    } catch (err: any) {
      triggerAlert(err.message || "Erreur d'enregistrement", true);
    } finally {
      setIsLoading(false);
    }
  };

  // Enregistrer tout (Textes, Images, Paramètres)
  const handleSaveAll = async () => {
    setIsLoading(true);
    try {
      await handleSaveSettings();
      const updatedSlides = [...slides];

      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        const res = await fetch("/api/admin/hero-slides", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slideId: slide.id.startsWith("temp-") ? null : slide.id,
            position: slide.position,
            media_type: slide.media_type || "image",
            image_url: slide.image_url,
            image_path: slide.image_path,
            alt_text: slide.alt_text,
            title_text: slide.title_text,
            subtitle_text: slide.subtitle_text,
            button_text: slide.button_text,
            aria_label: slide.aria_label,
            is_active: slide.is_active,
            crop_data: slide.crop_data,
          }),
        });

        const data = await res.json();
        if (!res.ok || data.error) {
          throw new Error(data.error || `Erreur d'enregistrement pour la position ${slide.position}`);
        }
        if (data.slide) {
          updatedSlides[i] = data.slide;
        }
      }

      setSlides(updatedSlides);
      triggerAlert("Tous les titres, sous-titres, boutons et images ont été enregistrés avec succès dans Supabase !");
    } catch (err: any) {
      triggerAlert(err.message || "Erreur d'enregistrement", true);
    } finally {
      setIsLoading(false);
    }
  };

  // Drag & Drop
  const handleDragStart = (idx: number) => {
    setDraggedIndex(idx);
  };

  const handleDragOver = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
  };

  const handleDrop = async (targetIdx: number) => {
    if (draggedIndex === null || draggedIndex === targetIdx) return;

    const newSlides = [...slides];
    const [moved] = newSlides.splice(draggedIndex, 1);
    newSlides.splice(targetIdx, 0, moved);

    const updated = newSlides.map((s, i) => ({ ...s, position: i + 1 }));
    setSlides(updated);
    setDraggedIndex(null);

    const slidesOrder = updated
      .filter((s) => !s.id.startsWith("temp-"))
      .map((s) => ({ id: s.id, position: s.position }));

    if (slidesOrder.length > 0) {
      await fetch("/api/admin/hero-slides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reorder", slidesOrder }),
      });
    }
  };

  // Recadrage
  const openCropModal = (index: number) => {
    const s = slides[index];
    setCroppingSlideIndex(index);
    setCropZoom(s.crop_data?.zoom || 1);
    setCropX(s.crop_data?.x || 0);
    setCropY(s.crop_data?.y || 0);
  };

  const saveCrop = async () => {
    if (croppingSlideIndex === null) return;
    const cropData = { zoom: cropZoom, x: cropX, y: cropY };

    setSlides((prev) => {
      const copy = [...prev];
      copy[croppingSlideIndex] = { ...copy[croppingSlideIndex], crop_data: cropData };
      return copy;
    });

    const slide = slides[croppingSlideIndex];
    if (!slide.id.startsWith("temp-")) {
      await fetch("/api/admin/hero-slides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slideId: slide.id,
          crop_data: cropData,
        }),
      });
    }

    setCroppingSlideIndex(null);
    triggerAlert("Paramètres de zoom et recadrage appliqués !");
  };

  // Supprimer une slide
  const handleDeleteSlide = async (index: number) => {
    const target = slides[index];
    if (target.id.startsWith("temp-")) return;

    if (!confirm("Voulez-vous vraiment supprimer cette image du carrousel ?")) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/hero-slides?id=${target.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Échec de la suppression");

      setSlides((prev) => {
        const copy = [...prev];
        copy[index] = {
          id: `temp-${target.position}`,
          media_type: "image",
          image_path: "",
          image_url: "/images/hero_background.png",
          alt_text: "Image de couverture BRWN",
          title_text: "Le Tiramisu Réinventé",
          subtitle_text: "Le premier tiramisu gastronomique au café de spécialité fait son entrée officielle au menu.",
          button_text: "Commander l'Original",
          position: target.position,
          is_active: false,
        };
        return copy;
      });

      triggerAlert("Image supprimée du carrousel.");
    } catch (err: any) {
      triggerAlert(err.message || "Erreur de suppression", true);
    } finally {
      setIsLoading(false);
    }
  };

  const activeSlides = slides.filter((s) => s.is_active);
  const currentPreviewSlide = activeSlides[activePreviewIndex % (activeSlides.length || 1)] || slides[0];

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <Link
            href="/admin/settings"
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#3D2216]/60 hover:text-[#3D2216] transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour aux Réglages
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black uppercase text-[#3D2216]">
            Carrousel de Couverture & Textes (Hero)
          </h1>
          <p className="text-xs text-[#3D2216]/70 mt-1">
            Modifiez le titre, le sous-titre, le bouton et les images du Hero pour chaque slide.
          </p>
        </div>

        <button
          onClick={handleSaveAll}
          disabled={isLoading}
          className="px-6 py-3 bg-[#3D2216] hover:bg-[#150B07] text-[#FAF7F2] font-bold text-xs uppercase tracking-widest rounded-full shadow-md transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <Save className="w-4 h-4" />
          Enregistrer tout
        </button>
      </div>

      {/* Notifications Banners */}
      {message && (
        <div className="mb-6 p-4 bg-[#4A6B5D]/10 border border-[#4A6B5D]/30 text-[#4A6B5D] rounded-2xl flex items-center gap-3 text-xs font-bold">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 p-4 bg-[#C83E4D]/10 border border-[#C83E4D]/30 text-[#C83E4D] rounded-2xl flex items-center gap-3 text-xs font-bold">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* PANNEAU DES OPTIONS GLOBALES DU HERO */}
      <div className="bg-white border border-[#3D2216]/10 rounded-3xl p-6 shadow-sm mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Sliders className="w-5 h-5 text-[#D97706]" />
          <h2 className="text-lg font-black uppercase text-[#3D2216]">
            Options d'Animation & Défilement
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex flex-col justify-between p-4 bg-[#FAF7F2] border border-[#3D2216]/10 rounded-2xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase text-[#3D2216] flex items-center gap-1.5">
                {heroSettings.autoplay_enabled ? <Play className="w-4 h-4 text-[#4A6B5D]" /> : <Pause className="w-4 h-4 text-[#C83E4D]" />}
                Défilement Automatique
              </span>
              <input
                type="checkbox"
                checked={heroSettings.autoplay_enabled}
                onChange={(e) =>
                  setHeroSettings({ ...heroSettings, autoplay_enabled: e.target.checked })
                }
                className="w-4 h-4 accent-[#3D2216] cursor-pointer"
              />
            </div>
            <p className="text-[10px] text-[#3D2216]/70">
              {heroSettings.autoplay_enabled ? "Le carrousel défile automatiquement." : "Défilement automatique désactivé."}
            </p>
          </div>

          <div className="p-4 bg-[#FAF7F2] border border-[#3D2216]/10 rounded-2xl">
            <label className="block text-xs font-bold uppercase text-[#3D2216] mb-1.5 flex items-center gap-1.5">
              <Timer className="w-4 h-4 text-[#C4A484]" />
              Intervalle : {heroSettings.autoplay_interval_ms} ms ({(heroSettings.autoplay_interval_ms / 1000).toFixed(1)}s)
            </label>
            <input
              type="range"
              min="2000"
              max="15000"
              step="500"
              value={heroSettings.autoplay_interval_ms}
              onChange={(e) =>
                setHeroSettings({ ...heroSettings, autoplay_interval_ms: Number(e.target.value) })
              }
              className="w-full accent-[#3D2216]"
            />
          </div>

          <div className="p-4 bg-[#FAF7F2] border border-[#3D2216]/10 rounded-2xl">
            <label className="block text-xs font-bold uppercase text-[#3D2216] mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#C4A484]" />
              Transition Fondu : {heroSettings.transition_duration_ms} ms
            </label>
            <input
              type="range"
              min="200"
              max="2000"
              step="50"
              value={heroSettings.transition_duration_ms}
              onChange={(e) =>
                setHeroSettings({ ...heroSettings, transition_duration_ms: Number(e.target.value) })
              }
              className="w-full accent-[#3D2216]"
            />
          </div>
        </div>
      </div>

      {/* Cartes des 3 Slides (Position 1, 2, 3) avec édition des Titres, Sous-titres et Bouton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
        {slides.map((slide, idx) => (
          <div
            key={slide.id}
            draggable
            onDragStart={() => handleDragStart(idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDrop={() => handleDrop(idx)}
            className={`bg-white border rounded-3xl p-5 shadow-sm flex flex-col justify-between transition-all ${
              draggedIndex === idx ? "opacity-40 border-dashed border-[#C4A484]" : "border-[#3D2216]/10"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-4 border-b border-[#3D2216]/5 pb-3">
                <div className="flex items-center gap-2 cursor-grab active:cursor-grabbing">
                  <GripVertical className="w-4 h-4 text-[#3D2216]/40" />
                  <span className="text-xs font-black uppercase text-[#3D2216]">
                    Position {slide.position}
                  </span>
                </div>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <span className="text-[10px] font-bold uppercase text-[#3D2216]/60">
                    {slide.is_active ? "Actif" : "Inactif"}
                  </span>
                  <input
                    type="checkbox"
                    checked={slide.is_active}
                    onChange={() => handleToggleActive(idx)}
                    className="w-4 h-4 accent-[#3D2216] cursor-pointer"
                  />
                </label>
              </div>

              {/* Aperçu Visuel Desktop */}
              <div className="relative w-full h-44 rounded-2xl overflow-hidden bg-[#FAF7F2] border border-[#3D2216]/10 mb-4 group">
                {slide.media_type === "video" ? (
                  <video
                    src={slide.image_url}
                    autoPlay
                    loop
                    muted
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Image
                    src={slide.image_url}
                    alt={slide.alt_text}
                    fill
                    quality={95}
                    className="object-cover transition-transform duration-300"
                    style={{
                      transform: `scale(${slide.crop_data?.zoom || 1}) translate(${slide.crop_data?.x || 0}px, ${slide.crop_data?.y || 0}px)`,
                    }}
                  />
                )}

                <div className="absolute inset-0 bg-[#150B07]/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                  <label className="p-2.5 bg-white text-[#3D2216] hover:bg-[#FAF7F2] rounded-full cursor-pointer shadow-md transition-transform hover:scale-110" title="Image Desktop">
                    <Monitor className="w-4 h-4" />
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) handleFileUpload(idx, e.target.files[0], false);
                      }}
                    />
                  </label>

                  <label className="p-2.5 bg-white text-[#3D2216] hover:bg-[#FAF7F2] rounded-full cursor-pointer shadow-md transition-transform hover:scale-110" title="Image Mobile">
                    <Smartphone className="w-4 h-4" />
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) handleFileUpload(idx, e.target.files[0], true);
                      }}
                    />
                  </label>

                  <button
                    onClick={() => openCropModal(idx)}
                    className="p-2.5 bg-white text-[#3D2216] hover:bg-[#FAF7F2] rounded-full shadow-md transition-transform hover:scale-110"
                    title="Zoom et Recadrage"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>

                  {!slide.id.startsWith("temp-") && (
                    <button
                      onClick={() => handleDeleteSlide(idx)}
                      className="p-2.5 bg-[#C83E4D] text-white hover:bg-[#A6323F] rounded-full shadow-md transition-transform hover:scale-110"
                      title="Supprimer la slide"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {(slide.previous_image_url || slide.previous_mobile_image_url) && (
                <button
                  onClick={() => handleRestore(idx, false)}
                  className="w-full mb-4 py-2 px-3 bg-[#FAF7F2] hover:bg-[#3D2216]/5 border border-[#3D2216]/10 rounded-xl text-[10px] font-bold uppercase tracking-wider text-[#3D2216] flex items-center justify-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#C4A484]" />
                  Restaurer l'image précédente
                </button>
              )}

              {/* SECTION EDITABLE DES TEXTES HERO (TITRE, SOUS-TITRE, BOUTON) */}
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#3D2216] flex items-center gap-1">
                      <Type className="w-3 h-3 text-[#D97706]" />
                      Titre Principal (H1)
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={slide.show_title !== false}
                        onChange={(e) => handleMetadataChange(idx, "show_title", e.target.checked)}
                        className="w-3.5 h-3.5 accent-[#3D2216] cursor-pointer rounded"
                      />
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${slide.show_title !== false ? "text-[#3D2216]" : "text-[#C83E4D]"}`}>
                        {slide.show_title !== false ? "Affiché" : "Masqué"}
                      </span>
                    </label>
                  </div>
                  <input
                    type="text"
                    value={slide.title_text || ""}
                    onChange={(e) => handleMetadataChange(idx, "title_text", e.target.value)}
                    placeholder="Le Tiramisu Réinventé..."
                    disabled={slide.show_title === false}
                    className={`w-full text-xs p-2.5 bg-[#FAF7F2] border border-[#3D2216]/10 rounded-xl focus:border-[#C4A484] outline-none font-bold ${
                      slide.show_title === false ? "opacity-40 bg-gray-100 cursor-not-allowed" : ""
                    }`}
                  />
                  {slide.show_title === false && (
                    <span className="text-[9px] text-[#C83E4D] font-bold uppercase tracking-wider mt-1 block">
                      ⚠️ Le titre H1 sera masqué sur le site pour cette slide.
                    </span>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#3D2216] flex items-center gap-1">
                      <AlignLeft className="w-3 h-3 text-[#D97706]" />
                      Sous-titre / Description
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={slide.show_subtitle !== false}
                        onChange={(e) => handleMetadataChange(idx, "show_subtitle", e.target.checked)}
                        className="w-3.5 h-3.5 accent-[#3D2216] cursor-pointer rounded"
                      />
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${slide.show_subtitle !== false ? "text-[#3D2216]" : "text-[#C83E4D]"}`}>
                        {slide.show_subtitle !== false ? "Affiché" : "Masqué"}
                      </span>
                    </label>
                  </div>
                  <textarea
                    rows={2}
                    value={slide.subtitle_text || ""}
                    onChange={(e) => handleMetadataChange(idx, "subtitle_text", e.target.value)}
                    placeholder="Le premier tiramisu gastronomique au café de spécialité..."
                    disabled={slide.show_subtitle === false}
                    className={`w-full text-xs p-2.5 bg-[#FAF7F2] border border-[#3D2216]/10 rounded-xl focus:border-[#C4A484] outline-none resize-none ${
                      slide.show_subtitle === false ? "opacity-40 bg-gray-100 cursor-not-allowed" : ""
                    }`}
                  />
                  {slide.show_subtitle === false && (
                    <span className="text-[9px] text-[#C83E4D] font-bold uppercase tracking-wider mt-1 block">
                      ⚠️ Le sous-titre sera masqué sur le site pour cette slide.
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#3D2216] mb-1">
                    Texte du Bouton CTA
                  </label>
                  <input
                    type="text"
                    value={slide.button_text || ""}
                    onChange={(e) => handleMetadataChange(idx, "button_text", e.target.value)}
                    placeholder="Commander l'Original..."
                    className="w-full text-xs p-2.5 bg-[#FAF7F2] border border-[#3D2216]/10 rounded-xl focus:border-[#C4A484] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#3D2216]/70 mb-1">
                    Texte alternatif (ALT SEO)
                  </label>
                  <input
                    type="text"
                    value={slide.alt_text || ""}
                    onChange={(e) => handleMetadataChange(idx, "alt_text", e.target.value)}
                    placeholder="Description pour l'accessibilité..."
                    className="w-full text-xs p-2.5 bg-[#FAF7F2] border border-[#3D2216]/10 rounded-xl focus:border-[#C4A484] outline-none text-[#3D2216]/80"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Section Prévisualisation en Direct du Carrousel Public */}
      <div className="bg-white border border-[#3D2216]/10 rounded-3xl p-6 shadow-sm mb-12">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-[#C4A484]" />
            <h2 className="text-lg font-black uppercase text-[#3D2216]">
              Prévisualisation du Carrousel & Textes Hero
            </h2>
          </div>
          <span className="text-xs font-semibold text-[#3D2216]/60">
            {activeSlides.length} slide(s) active(s)
          </span>
        </div>

        <div className="relative w-full h-[400px] rounded-2xl overflow-hidden bg-[#FAF7F2] border border-[#3D2216]/10 flex flex-col justify-center items-center text-center p-6">
          {activeSlides.length > 0 ? (
            <Image
              src={activeSlides[activePreviewIndex % activeSlides.length]?.image_url || "/images/hero_background.png"}
              alt="Live Preview"
              fill
              quality={95}
              className="object-cover transition-opacity duration-700"
            />
          ) : (
            <Image
              src="/images/hero_background.png"
              alt="Default Fallback"
              fill
              quality={95}
              className="object-cover"
            />
          )}

          <div className="relative z-10 max-w-xl">
            {currentPreviewSlide?.show_title !== false && (
              <h3 className="text-2xl sm:text-4xl font-extrabold text-[#150B07] uppercase tracking-tight">
                {currentPreviewSlide?.title_text || "Le Tiramisu Réinventé"}
              </h3>
            )}
            {currentPreviewSlide?.show_subtitle !== false && (
              <p className="text-xs sm:text-sm text-[#3D2216]/80 mt-3 font-light leading-relaxed">
                {currentPreviewSlide?.subtitle_text || "Le premier tiramisu gastronomique au café de spécialité fait son entrée officielle au menu."}
              </p>
            )}
            <button className="mt-5 px-6 py-2.5 bg-[#150B07] text-[#FAF7F2] text-xs font-bold uppercase rounded-full tracking-widest shadow-md">
              {currentPreviewSlide?.button_text || "Commander l'Original"}
            </button>
          </div>

          {activeSlides.length > 1 && (
            <>
              <button
                onClick={() =>
                  setActivePreviewIndex((prev) => (prev === 0 ? activeSlides.length - 1 : prev - 1))
                }
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 hover:bg-white text-[#3D2216] rounded-full shadow-md transition-all z-20"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() =>
                  setActivePreviewIndex((prev) => (prev + 1) % activeSlides.length)
                }
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 hover:bg-white text-[#3D2216] rounded-full shadow-md transition-all z-20"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {activeSlides.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
              {activeSlides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActivePreviewIndex(i)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    (activePreviewIndex % activeSlides.length) === i
                      ? "bg-[#3D2216] w-6"
                      : "bg-[#3D2216]/40"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modale de Zoom et Recadrage */}
      {croppingSlideIndex !== null && (
        <div className="fixed inset-0 bg-[#150B07]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-[#3D2216]/10">
            <h3 className="text-lg font-black uppercase text-[#3D2216] mb-4">
              Zoom & Recadrage (Slide Position {slides[croppingSlideIndex].position})
            </h3>

            <div className="relative w-full h-56 rounded-2xl overflow-hidden bg-[#FAF7F2] border mb-6">
              <Image
                src={slides[croppingSlideIndex].image_url}
                alt="Crop preview"
                fill
                quality={95}
                className="object-cover transition-transform duration-100"
                style={{
                  transform: `scale(${cropZoom}) translate(${cropX}px, ${cropY}px)`,
                }}
              />
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold uppercase text-[#3D2216] mb-1">
                  Niveau de Zoom : {cropZoom.toFixed(2)}x
                </label>
                <input
                  type="range"
                  min="1"
                  max="2.5"
                  step="0.05"
                  value={cropZoom}
                  onChange={(e) => setCropZoom(parseFloat(e.target.value))}
                  className="w-full accent-[#3D2216]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-[#3D2216] mb-1">
                    Décalage X : {cropX}px
                  </label>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    step="5"
                    value={cropX}
                    onChange={(e) => setCropX(parseInt(e.target.value))}
                    className="w-full accent-[#3D2216]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-[#3D2216] mb-1">
                    Décalage Y : {cropY}px
                  </label>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    step="5"
                    value={cropY}
                    onChange={(e) => setCropY(parseInt(e.target.value))}
                    className="w-full accent-[#3D2216]"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setCroppingSlideIndex(null)}
                className="px-5 py-2.5 bg-[#FAF7F2] text-[#3D2216] font-bold text-xs uppercase rounded-full border border-[#3D2216]/10"
              >
                Annuler
              </button>
              <button
                onClick={saveCrop}
                className="px-5 py-2.5 bg-[#3D2216] text-[#FAF7F2] font-bold text-xs uppercase rounded-full shadow-md"
              >
                Appliquer le recadrage
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
