import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export const revalidate = 0;

async function checkAdminAuth() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return { isAdmin: false, user: null, error: "Non authentifié" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return { isAdmin: false, user, error: "Accès non autorisé : privilèges administrateur requis" };
  }

  return { isAdmin: true, user, error: null };
}

async function ensureHeroBucket(supabaseAdmin: any) {
  try {
    const { data: bucket } = await supabaseAdmin.storage.getBucket("hero-images");
    if (!bucket) {
      await supabaseAdmin.storage.createBucket("hero-images", {
        public: true,
        fileSizeLimit: 8388608,
        allowedMimeTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/avif", "video/mp4", "video/webm"],
      });
    }
  } catch {
    // Ignorer si déjà existant
  }
}

// GET: Récupérer toutes les slides et les paramètres globaux du Hero
export async function GET() {
  try {
    const auth = await checkAdminAuth();
    if (!auth.isAdmin) {
      return NextResponse.json({ error: auth.error }, { status: 403 });
    }

    const supabaseAdmin = createAdminClient();
    const { data: slides, error: slidesError } = await supabaseAdmin
      .from("hero_slides")
      .select("*")
      .order("position", { ascending: true });

    if (slidesError && slidesError.message.includes("Could not find the table")) {
      return NextResponse.json({
        slides: [],
        settings: {
          id: "global",
          autoplay_enabled: true,
          autoplay_interval_ms: 6000,
          transition_duration_ms: 700,
        },
        warning: "La table 'public.hero_slides' n'a pas encore été créée dans Supabase. Veuillez exécuter le script SETUP_HERO_CAROUSEL.sql dans le SQL Editor de Supabase.",
      });
    }

    const { data: settingsData } = await supabaseAdmin
      .from("hero_settings")
      .select("*")
      .eq("id", "global")
      .maybeSingle();

    const heroSettings = settingsData || {
      id: "global",
      autoplay_enabled: true,
      autoplay_interval_ms: 6000,
      transition_duration_ms: 700,
    };

    return NextResponse.json({ slides: slides || [], settings: heroSettings });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Erreur serveur" }, { status: 500 });
  }
}

// POST: Gérer les uploads, mutations et enregistrement garanti des slides
export async function POST(req: NextRequest) {
  try {
    const auth = await checkAdminAuth();
    if (!auth.isAdmin) {
      return NextResponse.json({ error: auth.error }, { status: 403 });
    }

    const body = await req.json();
    const {
      action,
      slideId,
      position,
      media_type = "image",
      base64Data,
      isMobile = false,
      image_url,
      image_path,
      alt_text,
      title_text,
      subtitle_text,
      button_text,
      aria_label,
      is_active,
      crop_data,
      slidesOrder,
      heroSettings,
    } = body;

    const supabaseAdmin = createAdminClient();

    await ensureHeroBucket(supabaseAdmin);

    // Action 1: Mise à jour des paramètres globaux du Hero
    if (action === "update_settings" && heroSettings) {
      const { data: updatedSettings, error } = await supabaseAdmin
        .from("hero_settings")
        .upsert(
          {
            id: "global",
            autoplay_enabled: heroSettings.autoplay_enabled ?? true,
            autoplay_interval_ms: Math.max(1000, Number(heroSettings.autoplay_interval_ms) || 6000),
            transition_duration_ms: Math.max(100, Number(heroSettings.transition_duration_ms) || 700),
            updated_at: new Date().toISOString(),
            updated_by: auth.user?.id,
          },
          { onConflict: "id" }
        )
        .select()
        .single();

      if (error) {
        if (error.message.includes("Could not find the table")) {
          return NextResponse.json({
            error: "La table 'public.hero_settings' n'existe pas encore dans Supabase."
          }, { status: 400 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, settings: updatedSettings, message: "Paramètres globaux sauvegardés" });
    }

    // Action 2: Réorganisation par Drag & Drop
    if (action === "reorder" && Array.isArray(slidesOrder)) {
      for (const item of slidesOrder) {
        if (item.id && item.position) {
          await supabaseAdmin
            .from("hero_slides")
            .update({
              position: item.position,
              updated_at: new Date().toISOString(),
              updated_by: auth.user?.id,
            })
            .eq("id", item.id);
        }
      }
      return NextResponse.json({ success: true, message: "Ordre des slides mis à jour" });
    }

    // Action 3: Restauration de l'image précédente
    if (action === "restore" && slideId) {
      const { data: currentSlide } = await supabaseAdmin
        .from("hero_slides")
        .select("*")
        .eq("id", slideId)
        .single();

      if (!currentSlide || (!currentSlide.previous_image_url && !currentSlide.previous_mobile_image_url)) {
        return NextResponse.json({ error: "Aucune image précédente à restaurer pour cette slide" }, { status: 400 });
      }

      const updateData: any = {
        updated_at: new Date().toISOString(),
        updated_by: auth.user?.id,
      };

      if (isMobile) {
        updateData.mobile_image_url = currentSlide.previous_mobile_image_url;
        updateData.mobile_image_path = currentSlide.previous_mobile_image_path;
        updateData.previous_mobile_image_url = null;
        updateData.previous_mobile_image_path = null;
      } else {
        updateData.image_url = currentSlide.previous_image_url;
        updateData.image_path = currentSlide.previous_image_path;
        updateData.previous_image_url = null;
        updateData.previous_image_path = null;
      }

      const { data: restoredSlide, error: restoreError } = await supabaseAdmin
        .from("hero_slides")
        .update(updateData)
        .eq("id", slideId)
        .select()
        .single();

      if (restoreError) {
        return NextResponse.json({ error: restoreError.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, slide: restoredSlide, message: "Image précédente restaurée" });
    }

    // Action 4: Téléversement d'une nouvelle image
    if (base64Data) {
      const matches = base64Data.match(/^data:(image\/(jpeg|png|webp|avif)|video\/(mp4|webm));base64,(.+)$/);
      if (!matches) {
        return NextResponse.json({
          error: "Format de fichier invalide. Seuls JPEG, PNG, WebP, AVIF et MP4/WebM sont acceptés."
        }, { status: 400 });
      }

      const mimeType = matches[1];
      const extension = mimeType.split("/")[1] === "jpeg" ? "jpg" : mimeType.split("/")[1];
      const buffer = Buffer.from(matches[4], "base64");

      if (buffer.length > 8388608) {
        return NextResponse.json({ error: "La taille du fichier dépasse la limite maximale de 8 Mo." }, { status: 400 });
      }

      const fileName = `hero_${isMobile ? "mob_" : "desk_"}${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from("hero-images")
        .upload(filePath, buffer, {
          contentType: mimeType,
          upsert: true,
        });

      if (uploadError) {
        return NextResponse.json({ error: `Échec du stockage : ${uploadError.message}` }, { status: 500 });
      }

      const { data: publicUrlData } = supabaseAdmin.storage
        .from("hero-images")
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;

      let existingSlide = null;
      if (slideId && !slideId.startsWith("temp-")) {
        const { data } = await supabaseAdmin.from("hero_slides").select("*").eq("id", slideId).maybeSingle();
        existingSlide = data;
      }
      if (!existingSlide && position) {
        const { data } = await supabaseAdmin.from("hero_slides").select("*").eq("position", position).maybeSingle();
        existingSlide = data;
      }

      const slidePayload: any = {
        position: position || existingSlide?.position || 1,
        media_type: media_type || "image",
        alt_text: alt_text || existingSlide?.alt_text || "Image de couverture BRWN",
        title_text: title_text || existingSlide?.title_text || "Le Tiramisu Réinventé",
        subtitle_text: subtitle_text || existingSlide?.subtitle_text || "Le premier tiramisu gastronomique au café de spécialité fait son entrée officielle au menu.",
        button_text: button_text || existingSlide?.button_text || "Commander l'Original",
        aria_label: aria_label || existingSlide?.aria_label || "Image du carrousel de couverture BRWN",
        is_active: is_active !== undefined ? is_active : (existingSlide?.is_active ?? true),
        file_size_bytes: buffer.length,
        file_format: extension,
        crop_data: crop_data || existingSlide?.crop_data || { zoom: 1, x: 0, y: 0 },
        updated_at: new Date().toISOString(),
        updated_by: auth.user?.id,
      };

      if (isMobile) {
        slidePayload.mobile_image_path = filePath;
        slidePayload.mobile_image_url = publicUrl;
        if (existingSlide?.mobile_image_url) {
          slidePayload.previous_mobile_image_url = existingSlide.mobile_image_url;
          slidePayload.previous_mobile_image_path = existingSlide.mobile_image_path;
        }
      } else {
        slidePayload.image_path = filePath;
        slidePayload.image_url = publicUrl;
        if (existingSlide?.image_url) {
          slidePayload.previous_image_url = existingSlide.image_url;
          slidePayload.previous_image_path = existingSlide.image_path;
        }
      }

      let { data: upsertedSlide, error: upsertError } = await supabaseAdmin
        .from("hero_slides")
        .upsert(slidePayload, { onConflict: "position" })
        .select()
        .single();

      if (upsertError && upsertError.message.includes("column")) {
        // Fallback sans subtitle_text et button_text si colonnes pas encore ajoutées
        delete slidePayload.subtitle_text;
        delete slidePayload.button_text;
        const resFb = await supabaseAdmin
          .from("hero_slides")
          .upsert(slidePayload, { onConflict: "position" })
          .select()
          .single();
        upsertedSlide = resFb.data;
        upsertError = resFb.error;
      }

      if (upsertError) {
        return NextResponse.json({ error: upsertError.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, slide: upsertedSlide, message: "Image enregistrée avec succès" });
    }

    // Action 5: Upsert garanti pour Enregistrer tout ou mettre à jour les textes par position
    if (position || slideId) {
      let existingSlide = null;
      if (slideId && !slideId.startsWith("temp-")) {
        const { data } = await supabaseAdmin.from("hero_slides").select("*").eq("id", slideId).maybeSingle();
        existingSlide = data;
      }
      if (!existingSlide && position) {
        const { data } = await supabaseAdmin.from("hero_slides").select("*").eq("position", position).maybeSingle();
        existingSlide = data;
      }

      const targetPosition = position || existingSlide?.position || 1;

      const upsertPayload: any = {
        position: targetPosition,
        media_type: media_type || existingSlide?.media_type || "image",
        image_path: image_path || existingSlide?.image_path || "hero_background_default.png",
        image_url: image_url || existingSlide?.image_url || "/images/hero_background.png",
        alt_text: alt_text !== undefined ? alt_text : (existingSlide?.alt_text || "Image de couverture BRWN"),
        title_text: title_text !== undefined ? title_text : (existingSlide?.title_text || "Le Tiramisu Réinventé"),
        subtitle_text: subtitle_text !== undefined ? subtitle_text : (existingSlide?.subtitle_text || "Le premier tiramisu gastronomique au café de spécialité fait son entrée officielle au menu."),
        button_text: button_text !== undefined ? button_text : (existingSlide?.button_text || "Commander l'Original"),
        aria_label: aria_label !== undefined ? aria_label : (existingSlide?.aria_label || "Image du carrousel de couverture BRWN"),
        is_active: is_active !== undefined ? is_active : (existingSlide?.is_active ?? true),
        crop_data: crop_data !== undefined ? crop_data : (existingSlide?.crop_data || { zoom: 1, x: 0, y: 0 }),
        updated_at: new Date().toISOString(),
        updated_by: auth.user?.id,
      };

      let { data: savedSlide, error: saveError } = await supabaseAdmin
        .from("hero_slides")
        .upsert(upsertPayload, { onConflict: "position" })
        .select()
        .single();

      if (saveError && saveError.message.includes("column")) {
        // Fallback si la colonne button_text ou subtitle_text n'est pas encore créée dans Supabase
        delete upsertPayload.subtitle_text;
        delete upsertPayload.button_text;

        const resFb = await supabaseAdmin
          .from("hero_slides")
          .upsert(upsertPayload, { onConflict: "position" })
          .select()
          .single();

        if (!resFb.error) {
          return NextResponse.json({
            success: true,
            slide: resFb.data,
            warning: "Pour enregistrer les sous-titres et boutons personnalisés, veuillez exécuter les 2 lignes SQL d'ajout de colonnes dans Supabase."
          });
        }
        saveError = resFb.error;
      }

      if (saveError) {
        return NextResponse.json({ error: saveError.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, slide: savedSlide, message: "Slide sauvegardée avec succès" });
    }

    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Erreur serveur" }, { status: 500 });
  }
}

// DELETE: Supprimer une slide
export async function DELETE(req: NextRequest) {
  try {
    const auth = await checkAdminAuth();
    if (!auth.isAdmin) {
      return NextResponse.json({ error: auth.error }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const slideId = searchParams.get("id");

    if (!slideId) {
      return NextResponse.json({ error: "L'ID de la slide est requis" }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    const { data: slide } = await supabaseAdmin
      .from("hero_slides")
      .select("*")
      .eq("id", slideId)
      .single();

    if (slide) {
      if (slide.image_path && !slide.image_path.startsWith("hero_background")) {
        await supabaseAdmin.storage.from("hero-images").remove([slide.image_path]);
      }
      if (slide.mobile_image_path) {
        await supabaseAdmin.storage.from("hero-images").remove([slide.mobile_image_path]);
      }
      if (slide.previous_image_path) {
        await supabaseAdmin.storage.from("hero-images").remove([slide.previous_image_path]);
      }

      await supabaseAdmin.from("hero_slides").delete().eq("id", slideId);
    }

    return NextResponse.json({ success: true, message: "Slide supprimée avec succès" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Erreur serveur" }, { status: 500 });
  }
}
