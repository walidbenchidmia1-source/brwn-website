"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { createClient } from "@/utils/supabase/client";
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Eye, 
  EyeOff, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  Upload,
  X,
  Loader,
  Check,
  Package,
  Sparkles,
  ArrowRight
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price_cents: number;
  stock_quantity: number;
  low_stock_threshold: number;
  image_url: string | null;
  status: string;
  is_active: boolean;
  background_color: string;
  badge_text?: string;
  badge_bg_color?: string;
  badge_text_color?: string;
  button_bg_color?: string;
  button_text_color?: string;
  created_at: string;
  updated_at: string;
  allergens?: string[];
  tax_category?: string;
  gst_rate?: number;
  qst_rate?: number;
  is_zero_rated?: boolean;
}

interface InventoryHistory {
  id: string;
  product_id: string;
  previous_quantity: number;
  new_quantity: number;
  reason: string;
  created_at: string;
  profiles: {
    full_name: string | null;
  } | null;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [history, setHistory] = useState<InventoryHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPriceDollars, setFormPriceDollars] = useState("");
  const [formStock, setFormStock] = useState("");
  const [formThreshold, setFormThreshold] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formImageFile, setFormImageFile] = useState<File | null>(null);
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formBgColor, setFormBgColor] = useState("#6B3F2A");
  const [formBadgeText, setFormBadgeText] = useState("Création");
  const [formBadgeBgColor, setFormBadgeBgColor] = useState("#3D2216");
  const [formBadgeTextColor, setFormBadgeTextColor] = useState("#F9F6F0");
  const [formButtonBgColor, setFormButtonBgColor] = useState("#3D2216");
  const [formButtonTextColor, setFormButtonTextColor] = useState("#F9F6F0");
  const [uploadProgress, setUploadProgress] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // E-Commerce Extensions: Allergens and Taxes
  const [formAllergens, setFormAllergens] = useState<string[]>([]);
  const [formTaxCategory, setFormTaxCategory] = useState("taxable");
  const [formGstRate, setFormGstRate] = useState("0.05");
  const [formQstRate, setFormQstRate] = useState("0.09975");
  const [formIsZeroRated, setFormIsZeroRated] = useState(false);

  // Ingredients library state
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"products" | "ingredients">("products");
  
  // Drag and Drop & Liaison states
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [formIngredients, setFormIngredients] = useState<any[]>([]);

  // Modals for ingredients management
  const [isAddIngModalOpen, setIsAddIngModalOpen] = useState(false);
  const [isEditIngModalOpen, setIsEditIngModalOpen] = useState(false);
  const [selectedIng, setSelectedIng] = useState<any | null>(null);
  
  // Form states for ingredients
  const [formIngName, setFormIngName] = useState("");
  const [formIngSlug, setFormIngSlug] = useState("");
  const [formIngActive, setFormIngActive] = useState(true);
  const [formIngImageFile, setFormIngImageFile] = useState<File | null>(null);
  const [formIngImageUrl, setFormIngImageUrl] = useState("");
  const [ingFormError, setIngFormError] = useState<string | null>(null);
  const [ingActionLoading, setIngActionLoading] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch products
      const { data: prodData, error: prodErr } = await supabase
        .from("products")
        .select("*")
        .order("name", { ascending: true });

      if (prodErr) throw prodErr;
      setProducts(prodData || []);

      // 2. Fetch history with profiles join (last admin modifier name)
      const { data: histData, error: histErr } = await supabase
        .from("inventory_history")
        .select(`
          id,
          product_id,
          previous_quantity,
          new_quantity,
          reason,
          created_at,
          profiles (
            full_name
          )
        `)
        .order("created_at", { ascending: false });

      if (histErr) throw histErr;
      setHistory(histData as any[] || []);

      // 3. Fetch ingredients
      const { data: ingData, error: ingErr } = await supabase
        .from("ingredients")
        .select("*")
        .order("name", { ascending: true });

      if (ingErr) throw ingErr;
      setIngredients(ingData || []);
    } catch (err: any) {
      console.error("Error fetching data:", err);
      alert("Erreur lors de la récupération des données : " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Upload ingredient image to Supabase Storage
  const uploadIngredientImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `ing-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("ingredient-images")
      .upload(filePath, file, { cacheControl: "3600", upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from("ingredient-images")
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  // Reset ingredient form
  const resetIngForm = () => {
    setFormIngName("");
    setFormIngSlug("");
    setFormIngActive(true);
    setFormIngImageFile(null);
    setFormIngImageUrl("");
    setIngFormError(null);
    setSelectedIng(null);
  };

  // Handle Add Ingredient Submit
  const handleAddIngSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIngFormError(null);
    setUploadProgress(true);

    try {
      let finalImageUrl = formIngImageUrl;
      if (formIngImageFile) {
        finalImageUrl = await uploadIngredientImage(formIngImageFile);
      }

      if (!finalImageUrl) {
        throw new Error("Veuillez téléverser une image pour l'ingrédient");
      }

      const slugVal = formIngSlug.trim() || formIngName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

      const { error: insertError } = await supabase
        .from("ingredients")
        .insert({
          name: formIngName,
          slug: slugVal,
          image_url: finalImageUrl,
          is_active: formIngActive
        });

      if (insertError) throw insertError;

      setIsAddIngModalOpen(false);
      resetIngForm();
      await fetchData();
    } catch (err: any) {
      setIngFormError(err.message || "Erreur lors de la création de l'ingrédient");
    } finally {
      setUploadProgress(false);
    }
  };

  // Open Edit Ingredient Modal
  const openEditIngModal = (ing: any) => {
    setSelectedIng(ing);
    setFormIngName(ing.name);
    setFormIngSlug(ing.slug);
    setFormIngActive(ing.is_active);
    setFormIngImageUrl(ing.image_url);
    setFormIngImageFile(null);
    setIsEditIngModalOpen(true);
  };

  // Handle Edit Ingredient Submit
  const handleEditIngSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIng) return;
    setIngFormError(null);
    setUploadProgress(true);

    try {
      let finalImageUrl = formIngImageUrl;
      if (formIngImageFile) {
        finalImageUrl = await uploadIngredientImage(formIngImageFile);
      }

      const slugVal = formIngSlug.trim() || formIngName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

      const { error: updateError } = await supabase
        .from("ingredients")
        .update({
          name: formIngName,
          slug: slugVal,
          image_url: finalImageUrl,
          is_active: formIngActive
        })
        .eq("id", selectedIng.id);

      if (updateError) throw updateError;

      setIsEditIngModalOpen(false);
      resetIngForm();
      await fetchData();
    } catch (err: any) {
      setIngFormError(err.message || "Erreur lors de la modification de l'ingrédient");
    } finally {
      setUploadProgress(false);
    }
  };

  // Handle Delete Ingredient
  const handleDeleteIng = async (ing: any) => {
    if (!confirm(`Voulez-vous vraiment supprimer l'ingrédient "${ing.name}" ? Il sera retiré de tous les produits liés.`)) return;
    setIngActionLoading(ing.id);

    try {
      const { error } = await supabase
        .from("ingredients")
        .delete()
        .eq("id", ing.id);

      if (error) throw error;
      await fetchData();
    } catch (err: any) {
      alert("Erreur lors de la suppression de l'ingrédient : " + err.message);
    } finally {
      setIngActionLoading(null);
    }
  };

  // Drag and drop handlers for dynamic ordering
  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = (index: number) => {
    if (dragIndex === null) return;
    const items = [...formIngredients];
    const draggedItem = items[dragIndex];
    items.splice(dragIndex, 1);
    items.splice(index, 0, draggedItem);
    setFormIngredients(items);
    setDragIndex(null);
  };

  // Convert dollars to cents (e.g. 15.00 -> 1500)
  const toCents = (dollarsStr: string) => {
    const val = parseFloat(dollarsStr.replace(",", "."));
    if (isNaN(val)) return 0;
    return Math.round(val * 100);
  };

  // Convert cents to dollars string (e.g. 1500 -> 15.00)
  const toDollars = (cents: number) => {
    return (cents / 100).toFixed(2);
  };

  // Canadian Dollar Formatter (Intl CAD)
  const formatCAD = (cents: number) => {
    const dollars = cents / 100;
    return new Intl.NumberFormat('fr-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 2
    }).format(dollars);
  };

  // Date Formatter
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Auto-generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
  };

  const handleNameChange = (nameVal: string) => {
    setFormName(nameVal);
    // Auto slug if creating new
    if (isAddModalOpen) {
      setFormSlug(generateSlug(nameVal));
    }
  };

  // Upload file helper
  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `products/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from("product-images")
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  // Quick adjust stock +1 / -1
  const handleQuickAdjust = async (productId: string, currentStock: number, change: number) => {
    if (currentStock + change < 0) return; // Prevent local negative
    setActionLoading(`${productId}-${change}`);

    try {
      const reason = change > 0 ? "Ajout rapide portions" : "Retrait rapide portions";
      const { error } = await supabase.rpc("adjust_product_stock", {
        p_product_id: productId,
        p_quantity_change: change,
        p_reason: reason
      });

      if (error) throw error;
      await fetchData();
    } catch (err: any) {
      alert("Erreur de modification du stock : " + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Add Product Submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setUploadProgress(true);

    try {
      // 1. Upload image if provided
      let finalImageUrl = formImageUrl || "/images/tiramisu_coffee_box_cropped.png"; // default
      if (formImageFile) {
        finalImageUrl = await uploadImage(formImageFile);
      }

      // 2. Insert product with stock 0 initially
      const priceCents = toCents(formPriceDollars);
      const stockVal = parseInt(formStock) || 0;
      const thresholdVal = parseInt(formThreshold) || 5;

      if (priceCents < 0 || stockVal < 0 || thresholdVal < 0) {
        throw new Error("Les valeurs de prix et de stock ne peuvent pas être négatives");
      }

      if (!/^#[a-fA-F0-9]{6}$/.test(formBgColor) ||
          !/^#[a-fA-F0-9]{6}$/.test(formBadgeBgColor) ||
          !/^#[a-fA-F0-9]{6}$/.test(formBadgeTextColor) ||
          !/^#[a-fA-F0-9]{6}$/.test(formButtonBgColor) ||
          !/^#[a-fA-F0-9]{6}$/.test(formButtonTextColor)) {
        throw new Error("Toutes les couleurs doivent être des codes hexadécimaux valides au format #RRGGBB");
      }

      const { data: newProd, error: insertError } = await supabase
        .from("products")
        .insert({
          name: formName,
          slug: formSlug,
          description: formDescription,
          price_cents: priceCents,
          stock_quantity: 0, // must start at 0 to pass through adjust_product_stock RPC triggers!
          low_stock_threshold: thresholdVal,
          image_url: finalImageUrl,
          is_active: formIsActive,
          background_color: formBgColor,
          badge_text: formBadgeText,
          badge_bg_color: formBadgeBgColor,
          badge_text_color: formBadgeTextColor,
          button_bg_color: formButtonBgColor,
          button_text_color: formButtonTextColor,
          allergens: formAllergens,
          tax_category: formTaxCategory,
          gst_rate: parseFloat(formGstRate) || 0.05,
          qst_rate: parseFloat(formQstRate) || 0.09975,
          is_zero_rated: formIsZeroRated
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // 2b. Insert product ingredients liaison rows
      if (newProd && formIngredients.length > 0) {
        const liaisonRows = formIngredients.map((ing, idx) => ({
          product_id: newProd.id,
          ingredient_id: ing.id,
          display_order: idx
        }));
        const { error: liaisonError } = await supabase
          .from("product_ingredients")
          .insert(liaisonRows);
        if (liaisonError) throw liaisonError;
      }

      // 3. Log initial stock via adjust_product_stock RPC transaction
      if (stockVal > 0 && newProd) {
        const { error: stockError } = await supabase.rpc("adjust_product_stock", {
          p_product_id: newProd.id,
          p_quantity_change: stockVal,
          p_reason: "Stock initial à la création"
        });
        if (stockError) throw stockError;
      }

      // Clean state
      setIsAddModalOpen(false);
      resetForm();
      await fetchData();
    } catch (err: any) {
      setFormError(err.message || "Erreur lors de la création du produit");
    } finally {
      setUploadProgress(false);
    }
  };

  // Open Edit Modal
  const openEditModal = async (product: Product) => {
    setSelectedProduct(product);
    setFormName(product.name);
    setFormSlug(product.slug);
    setFormDescription(product.description || "");
    setFormPriceDollars(toDollars(product.price_cents));
    setFormStock(product.stock_quantity.toString());
    setFormThreshold(product.low_stock_threshold.toString());
    setFormIsActive(product.is_active);
    setFormImageUrl(product.image_url || "");
    setFormBgColor(product.background_color || "#6B3F2A");
    setFormBadgeText(product.badge_text || "Création");
    setFormBadgeBgColor(product.badge_bg_color || "#3D2216");
    setFormBadgeTextColor(product.badge_text_color || "#F9F6F0");
    setFormButtonBgColor(product.button_bg_color || "#3D2216");
    setFormButtonTextColor(product.button_text_color || "#F9F6F0");
    setFormImageFile(null);

    // E-Commerce Extensions
    setFormAllergens(product.allergens || []);
    setFormTaxCategory(product.tax_category || "taxable");
    setFormGstRate((product.gst_rate ?? 0.05).toString());
    setFormQstRate((product.qst_rate ?? 0.09975).toString());
    setFormIsZeroRated(!!product.is_zero_rated);

    // Fetch linked ingredients in correct order
    const { data: linkedIngs } = await supabase
      .from("product_ingredients")
      .select(`
        display_order,
        ingredients (
          id,
          name,
          image_url
        )
      `)
      .eq("product_id", product.id)
      .order("display_order", { ascending: true });

    const loadedIngs = (linkedIngs || [])
      .filter((item: any) => item.ingredients)
      .map((item: any) => ({
        id: item.ingredients.id,
        name: item.ingredients.name,
        image_url: item.ingredients.image_url
      }));
    setFormIngredients(loadedIngs);
    
    setIsEditModalOpen(true);
  };

  // Handle Edit Product Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setFormError(null);
    setUploadProgress(true);

    try {
      // 1. Upload new image if provided
      let finalImageUrl = formImageUrl;
      if (formImageFile) {
        finalImageUrl = await uploadImage(formImageFile);
      }

      const priceCents = toCents(formPriceDollars);
      const stockVal = parseInt(formStock) || 0;
      const thresholdVal = parseInt(formThreshold) || 5;

      if (priceCents < 0 || stockVal < 0 || thresholdVal < 0) {
        throw new Error("Les valeurs de prix et de stock ne peuvent pas être négatives");
      }

      if (!/^#[a-fA-F0-9]{6}$/.test(formBgColor) ||
          !/^#[a-fA-F0-9]{6}$/.test(formBadgeBgColor) ||
          !/^#[a-fA-F0-9]{6}$/.test(formBadgeTextColor) ||
          !/^#[a-fA-F0-9]{6}$/.test(formButtonBgColor) ||
          !/^#[a-fA-F0-9]{6}$/.test(formButtonTextColor)) {
        throw new Error("Toutes les couleurs doivent être des codes hexadécimaux valides au format #RRGGBB");
      }

      // Calculate stock difference to trigger transactional stock adjustment
      const stockDiff = stockVal - selectedProduct.stock_quantity;

      // 2. Update general product details (excluding stock_quantity directly!)
      const { error: updateError } = await supabase
        .from("products")
        .update({
          name: formName,
          slug: formSlug,
          description: formDescription,
          price_cents: priceCents,
          low_stock_threshold: thresholdVal,
          image_url: finalImageUrl,
          is_active: formIsActive,
          background_color: formBgColor,
          badge_text: formBadgeText,
          badge_bg_color: formBadgeBgColor,
          badge_text_color: formBadgeTextColor,
          button_bg_color: formButtonBgColor,
          button_text_color: formButtonTextColor,
          allergens: formAllergens,
          tax_category: formTaxCategory,
          gst_rate: parseFloat(formGstRate) || 0.05,
          qst_rate: parseFloat(formQstRate) || 0.09975,
          is_zero_rated: formIsZeroRated
        })
        .eq("id", selectedProduct.id);

      if (updateError) throw updateError;

      // 2b. Update product ingredients relations: delete existing and rewrite new ordered ones
      const { error: deleteLiaisonErr } = await supabase
        .from("product_ingredients")
        .delete()
        .eq("product_id", selectedProduct.id);

      if (deleteLiaisonErr) throw deleteLiaisonErr;

      if (formIngredients.length > 0) {
        const liaisonRows = formIngredients.map((ing, idx) => ({
          product_id: selectedProduct.id,
          ingredient_id: ing.id,
          display_order: idx
        }));
        const { error: liaisonError } = await supabase
          .from("product_ingredients")
          .insert(liaisonRows);
        if (liaisonError) throw liaisonError;
      }

      // 3. Adjust stock transactionally if there is a difference
      if (stockDiff !== 0) {
        const { error: stockError } = await supabase.rpc("adjust_product_stock", {
          p_product_id: selectedProduct.id,
          p_quantity_change: stockDiff,
          p_reason: "Modification manuelle d'inventaire depuis dashboard"
        });
        if (stockError) throw stockError;
      }

      setIsEditModalOpen(false);
      resetForm();
      await fetchData();
    } catch (err: any) {
      setFormError(err.message || "Erreur lors de la mise à jour du produit");
    } finally {
      setUploadProgress(false);
    }
  };

  // Toggle active status directly
  const handleToggleActive = async (product: Product) => {
    setActionLoading(`${product.id}-active`);
    try {
      const { error } = await supabase
        .from("products")
        .update({ is_active: !product.is_active })
        .eq("id", product.id);

      if (error) throw error;
      await fetchData();
    } catch (err: any) {
      alert("Erreur lors de l'activation/désactivation : " + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Delete product permanently
  const handleDeleteProduct = async (product: Product) => {
    if (!confirm(`Voulez-vous vraiment supprimer définitivement la saveur "${product.name}" ? Toutes les données associées (stocks, historique, ingrédients liés) seront supprimées.`)) return;
    setActionLoading(`${product.id}-delete`);
    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", product.id);

      if (error) throw error;
      await fetchData();
    } catch (err: any) {
      alert("Erreur lors de la suppression du produit : " + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const resetForm = () => {
    setFormName("");
    setFormSlug("");
    setFormDescription("");
    setFormPriceDollars("");
    setFormStock("");
    setFormThreshold("5");
    setFormIsActive(true);
    setFormImageFile(null);
    setFormImageUrl("");
    setFormBgColor("#6B3F2A");
    setFormBadgeText("Création");
    setFormBadgeBgColor("#3D2216");
    setFormBadgeTextColor("#F9F6F0");
    setFormButtonBgColor("#3D2216");
    setFormButtonTextColor("#F9F6F0");
    setFormIngredients([]);
    setFormError(null);
    setSelectedProduct(null);
    setFormAllergens([]);
    setFormTaxCategory("taxable");
    setFormGstRate("0.05");
    setFormQstRate("0.09975");
    setFormIsZeroRated(false);
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">
            Produits & Stocks
          </h1>
          <p className="text-xs text-[#3D2216]/60 mt-1 uppercase tracking-wider font-semibold">
            Gérez vos tiramisus, tarifications et alertes d'inventaire
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { resetForm(); setIsAddModalOpen(true); }}
            className="px-5 py-3 bg-[#3D2216] hover:bg-[#150B07] text-[#F9F6F0] font-sans text-xs font-bold tracking-widest uppercase rounded-full transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Ajouter une saveur
          </button>
        </div>
      </div>

      {/* Tab Selector */}
      <div className="flex gap-2 border-b border-[#3D2216]/10 pb-4">
        <button
          onClick={() => setActiveTab("products")}
          className={`px-6 py-2.5 rounded-full font-sans text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${activeTab === "products" ? "bg-[#3D2216] text-[#F9F6F0] shadow-md scale-102" : "text-[#3D2216]/60 hover:text-[#3D2216] hover:bg-[#3D2216]/5"}`}
        >
          Catalogue & Stocks
        </button>
        <button
          onClick={() => setActiveTab("ingredients")}
          className={`px-6 py-2.5 rounded-full font-sans text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${activeTab === "ingredients" ? "bg-[#3D2216] text-[#F9F6F0] shadow-md scale-102" : "text-[#3D2216]/60 hover:text-[#3D2216] hover:bg-[#3D2216]/5"}`}
        >
          Bibliothèque d'Ingrédients
        </button>
      </div>

      {/* Main Content Areas switcher */}
      {activeTab === "products" && (
        isLoading ? (
          <div className="py-24 text-center flex flex-col items-center gap-4">
            <Loader className="w-8 h-8 animate-spin text-[#C4A484]" />
            <span className="text-xs uppercase tracking-widest font-bold text-[#3D2216]/60">Chargement du catalogue...</span>
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white border-2 border-[#3D2216] rounded-2xl p-12 text-center shadow-[4px_4px_0px_0px_#3D2216] flex flex-col items-center gap-4">
            <Package className="w-12 h-12 text-[#3D2216]/30" />
            <h3 className="font-sans text-lg font-black uppercase">Aucune saveur de tiramisu</h3>
            <p className="text-sm font-light text-[#3D2216]/60 max-w-sm">
              Commencez par ajouter votre premier produit pour le faire apparaître sur le site.
            </p>
          </div>
        ) : (
          <div className="bg-white border-2 border-[#3D2216] rounded-2xl shadow-[4px_4px_0px_0px_#3D2216] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FAF7F2] border-b border-[#3D2216]/15 text-xs font-black uppercase tracking-wider text-[#3D2216]/70">
                    <th className="py-4 px-6">Produit</th>
                    <th className="py-4 px-6">Prix (CAD)</th>
                    <th className="py-4 px-6 text-center">Stock</th>
                    <th className="py-4 px-6 text-center">Statut</th>
                    <th className="py-4 px-6">Modifications & Suivi</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3D2216]/10 text-sm">
                  {products.map((product) => {
                    const isLowStock = product.is_active && product.stock_quantity > 0 && product.stock_quantity <= product.low_stock_threshold;
                    const isOutOfStock = product.stock_quantity === 0;

                    // Find latest modifier in history
                    const prodHistory = history.filter(h => h.product_id === product.id);
                    const lastAdjustment = prodHistory.length > 0 ? prodHistory[0] : null;

                    return (
                      <tr key={product.id} className="hover:bg-[#FAF7F2]/50 transition-colors">
                        {/* Title & Image */}
                        <td className="py-5 px-6 font-medium">
                          <div className="flex items-center gap-4">
                            <div className="relative w-12 h-12 rounded-xl bg-[#FAF7F2] border border-[#3D2216]/10 overflow-hidden shrink-0">
                              <Image
                                src={product.image_url || "/images/tiramisu_coffee_box_cropped.png"}
                                alt={product.name}
                                fill
                                sizes="48px"
                                className="object-contain p-1"
                              />
                            </div>
                            <div className="flex flex-col text-left">
                              <span className="font-sans font-black text-[#3D2216] uppercase leading-tight">
                                {product.name}
                              </span>
                              <span className="font-mono text-[10px] text-[#3D2216]/50 mt-0.5">
                                /{product.slug}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Price */}
                        <td className="py-5 px-6 font-mono font-semibold text-[#3D2216]">
                          {toDollars(product.price_cents)} CAD
                        </td>

                        {/* Stock Controls */}
                        <td className="py-5 px-6">
                          <div className="flex flex-col items-center gap-1.5">
                            <div className="flex items-center gap-3">
                              {/* Minus Button */}
                              <button
                                onClick={() => handleQuickAdjust(product.id, product.stock_quantity, -1)}
                                disabled={actionLoading === `${product.id}--1` || isOutOfStock}
                                className="w-7 h-7 rounded-full border border-[#3D2216]/30 hover:border-[#3D2216] flex items-center justify-center cursor-pointer hover:bg-[#3D2216]/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-bold text-xs"
                              >
                                -
                              </button>
                              
                              {/* Current stock display */}
                              <span className={`w-8 text-center font-mono font-black text-sm ${isOutOfStock ? "text-[#C83E4D]" : isLowStock ? "text-[#D97706]" : "text-[#3D2216]"}`}>
                                {product.stock_quantity}
                              </span>
                              
                              {/* Plus Button */}
                              <button
                                onClick={() => handleQuickAdjust(product.id, product.stock_quantity, 1)}
                                disabled={actionLoading === `${product.id}-1`}
                                className="w-7 h-7 rounded-full border border-[#3D2216]/30 hover:border-[#3D2216] flex items-center justify-center cursor-pointer hover:bg-[#3D2216]/5 transition-colors font-bold text-xs"
                              >
                                +
                              </button>
                            </div>
                            {isLowStock && (
                              <span className="text-[9px] font-bold uppercase tracking-wider text-[#D97706] flex items-center gap-0.5">
                                <AlertTriangle className="w-2.5 h-2.5" /> Stock faible
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status Badges */}
                        <td className="py-5 px-6 text-center">
                          {isOutOfStock ? (
                            <span className="px-2.5 py-0.5 bg-[#C83E4D]/10 text-[#C83E4D] text-[10px] font-bold uppercase rounded-full border border-[#C83E4D]/20">
                              En rupture
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 bg-green-700/10 text-green-800 text-[10px] font-bold uppercase rounded-full border border-green-700/20">
                              Disponible
                            </span>
                          )}
                        </td>

                        {/* Logs & tracking metadata */}
                        <td className="py-5 px-6">
                          <div className="flex flex-col text-left gap-1">
                            <span className="text-[10px] text-[#3D2216]/60">
                              Créé le : <strong className="font-bold">{formatDate(product.created_at)}</strong>
                            </span>
                            <span className="text-[10px] text-[#3D2216]/60">
                              Modifié le : <strong className="font-bold">{formatDate(product.updated_at)}</strong>
                            </span>
                            {lastAdjustment && (
                              <span className="text-[10px] text-[#C4A484] font-semibold italic mt-0.5 leading-tight">
                                Dernier stock : {lastAdjustment.profiles?.full_name || "Admin"} ({formatDate(lastAdjustment.created_at)})
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Actions edit / visibility */}
                        <td className="py-5 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Active / Inactive switch */}
                            <button
                              onClick={() => handleToggleActive(product)}
                              disabled={actionLoading === `${product.id}-active`}
                              className={`p-2 rounded-full cursor-pointer transition-colors ${product.is_active ? "hover:bg-green-700/10 text-green-700" : "hover:bg-[#C83E4D]/10 text-[#3D2216]/40"}`}
                              title={product.is_active ? "Désactiver (Cacher aux clients)" : "Activer (Montrer aux clients)"}
                            >
                              {product.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </button>
                            
                            {/* Edit button */}
                            <button
                              onClick={() => openEditModal(product)}
                              className="p-2 hover:bg-[#3D2216]/5 text-[#3D2216] rounded-full cursor-pointer transition-colors"
                              title="Modifier les détails"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            {/* Delete product button */}
                            <button
                              onClick={() => handleDeleteProduct(product)}
                              disabled={actionLoading === `${product.id}-delete`}
                              className="p-2 hover:bg-red-50 text-red-600 rounded-full cursor-pointer transition-colors disabled:opacity-40"
                              title="Supprimer définitivement"
                            >
                              {actionLoading === `${product.id}-delete` ? (
                                <Loader className="w-4 h-4 animate-spin text-red-600" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {activeTab === "ingredients" && (
        isLoading ? (
          <div className="py-24 text-center flex flex-col items-center gap-4">
            <Loader className="w-8 h-8 animate-spin text-[#C4A484]" />
            <span className="text-xs uppercase tracking-widest font-bold text-[#3D2216]/60">Chargement de la bibliothèque...</span>
          </div>
        ) : ingredients.length === 0 ? (
          <div className="bg-white border-2 border-[#3D2216] rounded-2xl p-12 text-center shadow-[4px_4px_0px_0px_#3D2216] flex flex-col items-center gap-4">
            <Package className="w-12 h-12 text-[#3D2216]/30" />
            <h3 className="font-sans text-lg font-black uppercase">Aucun ingrédient enregistré</h3>
            <p className="text-sm font-light text-[#3D2216]/60 max-w-sm">
              Ajoutez des ingrédients réutilisables pour pouvoir les associer à vos tiramisus.
            </p>
            <button
              onClick={() => { resetIngForm(); setIsAddIngModalOpen(true); }}
              className="mt-2 px-5 py-2.5 bg-[#3D2216] hover:bg-[#150B07] text-[#F9F6F0] font-sans text-xs font-bold tracking-widest uppercase rounded-full transition-all duration-300"
            >
              Créer un ingrédient
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center bg-[#FAF7F2] border-2 border-[#3D2216] rounded-2xl p-6 shadow-[4px_4px_0px_0px_#3D2216]">
              <div>
                <h2 className="font-sans text-lg font-black uppercase text-[#3D2216]">Bibliothèque d'Ingrédients</h2>
                <p className="text-xs text-[#3D2216]/60 mt-0.5">Gérez la liste globale des ingrédients de la trilogie et leurs visuels</p>
              </div>
              <button
                onClick={() => { resetIngForm(); setIsAddIngModalOpen(true); }}
                className="px-5 py-2.5 bg-[#3D2216] hover:bg-[#150B07] text-[#F9F6F0] font-sans text-xs font-bold tracking-widest uppercase rounded-full transition-all duration-300 flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> Créer un ingrédient
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
              {ingredients.map((ing) => (
                <div 
                  key={ing.id} 
                  className="bg-white border-2 border-[#3D2216] rounded-3xl p-5 shadow-[4px_4px_0px_0px_#3D2216] flex flex-col items-center gap-3.5 relative group transition-transform hover:-translate-y-0.5"
                >
                  <div className="w-16 h-16 rounded-full border border-[#3D2216]/10 overflow-hidden flex items-center justify-center bg-[#FAF7F2] relative">
                    <Image
                      src={ing.image_url}
                      alt={ing.name}
                      fill
                      sizes="64px"
                      className="object-contain p-2"
                    />
                  </div>
                  
                  <div className="text-center w-full">
                    <span className="font-sans text-xs font-black text-[#3D2216] uppercase block truncate">{ing.name}</span>
                    <span className="font-mono text-[9px] text-[#3D2216]/50 block mt-0.5">{ing.slug}</span>
                    <span className={`inline-block text-[9px] font-bold px-2.5 py-0.5 rounded-full mt-2 uppercase ${ing.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                      {ing.is_active ? "Actif" : "Inactif"}
                    </span>
                  </div>

                  <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => openEditIngModal(ing)}
                      className="p-1 hover:bg-[#3D2216]/5 text-[#3D2216] rounded-full cursor-pointer transition-colors"
                      title="Modifier"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => handleDeleteIng(ing)}
                      disabled={ingActionLoading === ing.id}
                      className="p-1 hover:bg-red-50 text-red-600 rounded-full cursor-pointer transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {/* ========================================== */}
      {/* ADD SAVEUR MODAL                           */}
      {/* ========================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#150B07]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#F9F6F0] w-full max-w-lg rounded-3xl p-8 border border-[#3D2216]/10 relative shadow-2xl overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-6 right-6 p-1.5 rounded-full hover:bg-[#3D2216]/5 text-[#3D2216] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-sans text-xl font-black text-[#3D2216] uppercase tracking-tight mb-6">
              Ajouter une nouvelle saveur
            </h3>

            {formError && (
              <div className="bg-[#C83E4D]/10 border border-[#C83E4D]/20 text-[#C83E4D] rounded-2xl p-4 mb-6 text-xs font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="flex flex-col gap-4">
              {/* Product name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#3D2216] uppercase tracking-wider">
                  Nom du tiramisu
                </label>
                <input
                  type="text"
                  placeholder="Ex: Tiramisu Pistache"
                  value={formName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full bg-[#150B07]/5 border border-[#3D2216]/10 focus:border-[#C4A484] rounded-full py-3 px-6 text-sm text-[#3D2216] outline-hidden"
                  required
                />
              </div>

              {/* Slug */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#3D2216] uppercase tracking-wider">
                  Slug (URL)
                </label>
                <input
                  type="text"
                  placeholder="Ex: tiramisu-pistache"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  className="w-full bg-[#150B07]/5 border border-[#3D2216]/10 focus:border-[#C4A484] rounded-full py-3 px-6 text-sm text-[#3D2216] outline-hidden"
                  required
                />
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#3D2216] uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  placeholder="Description gourmande des ingrédients et de la recette..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-[#150B07]/5 border border-[#3D2216]/10 focus:border-[#C4A484] rounded-2xl py-3 px-6 text-sm text-[#3D2216] outline-hidden min-h-[100px]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Price */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#3D2216] uppercase tracking-wider">
                    Prix (CAD $)
                  </label>
                  <input
                    type="text"
                    placeholder="15.00"
                    value={formPriceDollars}
                    onChange={(e) => setFormPriceDollars(e.target.value)}
                    className="w-full bg-[#150B07]/5 border border-[#3D2216]/10 focus:border-[#C4A484] rounded-full py-3 px-6 text-sm text-[#3D2216] outline-hidden text-center font-bold"
                    required
                  />
                </div>

                {/* Initial Stock */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#3D2216] uppercase tracking-wider">
                    Stock Initial
                  </label>
                  <input
                    type="number"
                    placeholder="25"
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value)}
                    className="w-full bg-[#150B07]/5 border border-[#3D2216]/10 focus:border-[#C4A484] rounded-full py-3 px-6 text-sm text-[#3D2216] outline-hidden text-center font-bold"
                    required
                  />
                </div>

                {/* Low stock threshold */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#3D2216] uppercase tracking-wider">
                    Seuil Stock Faible
                  </label>
                  <input
                    type="number"
                    value={formThreshold}
                    onChange={(e) => setFormThreshold(e.target.value)}
                    className="w-full bg-[#150B07]/5 border border-[#3D2216]/10 focus:border-[#C4A484] rounded-full py-3 px-6 text-sm text-[#3D2216] outline-hidden text-center"
                    required
                  />
                </div>
              </div>

              {/* Image upload */}
              <div className="flex flex-col gap-1.5 mt-2">
                <label className="text-xs font-bold text-[#3D2216] uppercase tracking-wider">
                  Visuel du produit (Stockage Supabase)
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex-1 flex items-center justify-center gap-2 border-2 border-dashed border-[#3D2216]/25 hover:border-[#3D2216]/50 rounded-2xl py-4 bg-[#FAF7F2] hover:bg-white transition-all cursor-pointer text-xs font-bold uppercase tracking-wider text-[#3D2216]/60">
                    <Upload className="w-4 h-4" />
                    {formImageFile ? formImageFile.name : "Téléverser une image"}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          setFormImageFile(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

          {/* Background Color Picker */}
          <div className="flex flex-col gap-1.5 mt-2">
            <label className="text-xs font-bold text-[#3D2216] uppercase tracking-wider">
              Couleur du fond (Public)
            </label>
            <div className="flex items-center gap-4">
              <div className="relative w-12 h-12 rounded-full overflow-hidden border border-[#3D2216]/15 shrink-0 cursor-pointer shadow-xs">
                <input
                  type="color"
                  value={formBgColor}
                  onChange={(e) => setFormBgColor(e.target.value.toUpperCase())}
                  className="absolute -inset-2 w-16 h-16 cursor-pointer border-0 p-0"
                />
              </div>
              <input
                type="text"
                placeholder="#6B3F2A"
                value={formBgColor}
                onChange={(e) => setFormBgColor(e.target.value)}
                className="w-full bg-[#150B07]/5 border border-[#3D2216]/10 focus:border-[#C4A484] rounded-full py-3 px-6 text-sm text-[#3D2216] outline-hidden font-mono uppercase"
                maxLength={7}
                required
              />
            </div>
          </div>

          {/* Badge Customizer */}
          <div className="flex flex-col gap-3 mt-3 border-t border-[#3D2216]/10 pt-4">
            <h4 className="font-sans text-xs font-black text-[#3D2216] uppercase tracking-wider">
              Personnalisation du Badge (Public)
            </h4>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-[#3D2216]/70 uppercase tracking-wide">Texte du badge</label>
              <input
                type="text"
                placeholder="Ex: Création"
                value={formBadgeText}
                onChange={(e) => setFormBadgeText(e.target.value)}
                className="w-full bg-[#150B07]/5 border border-[#3D2216]/10 focus:border-[#C4A484] rounded-full py-3 px-6 text-xs text-[#3D2216] outline-hidden"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-[#3D2216]/70 uppercase tracking-wide">Fond du badge</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formBadgeBgColor}
                    onChange={(e) => setFormBadgeBgColor(e.target.value.toUpperCase())}
                    className="w-8 h-8 rounded-full border border-[#3D2216]/15 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formBadgeBgColor}
                    onChange={(e) => setFormBadgeBgColor(e.target.value)}
                    className="w-full bg-[#150B07]/5 border border-[#3D2216]/10 rounded-full py-2 px-3 text-xs font-mono uppercase"
                    maxLength={7}
                    required
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-[#3D2216]/70 uppercase tracking-wide">Texte / Symboles</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formBadgeTextColor}
                    onChange={(e) => setFormBadgeTextColor(e.target.value.toUpperCase())}
                    className="w-8 h-8 rounded-full border border-[#3D2216]/15 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formBadgeTextColor}
                    onChange={(e) => setFormBadgeTextColor(e.target.value)}
                    className="w-full bg-[#150B07]/5 border border-[#3D2216]/10 rounded-full py-2 px-3 text-xs font-mono uppercase"
                    maxLength={7}
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Commander Button Customizer */}
          <div className="flex flex-col gap-3 mt-3 border-t border-[#3D2216]/10 pt-4">
            <h4 className="font-sans text-xs font-black text-[#3D2216] uppercase tracking-wider">
              Bouton Commander (Public)
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-[#3D2216]/70 uppercase tracking-wide">Fond du bouton</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formButtonBgColor}
                    onChange={(e) => setFormButtonBgColor(e.target.value.toUpperCase())}
                    className="w-8 h-8 rounded-full border border-[#3D2216]/15 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formButtonBgColor}
                    onChange={(e) => setFormButtonBgColor(e.target.value)}
                    className="w-full bg-[#150B07]/5 border border-[#3D2216]/10 rounded-full py-2 px-3 text-xs font-mono uppercase"
                    maxLength={7}
                    required
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-[#3D2216]/70 uppercase tracking-wide">Texte du bouton</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formButtonTextColor}
                    onChange={(e) => setFormButtonTextColor(e.target.value.toUpperCase())}
                    className="w-8 h-8 rounded-full border border-[#3D2216]/15 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formButtonTextColor}
                    onChange={(e) => setFormButtonTextColor(e.target.value)}
                    className="w-full bg-[#150B07]/5 border border-[#3D2216]/10 rounded-full py-2 px-3 text-xs font-mono uppercase"
                    maxLength={7}
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Live Responsive Preview */}
          <div className="mt-4 p-4 border border-[#3D2216]/10 rounded-2xl bg-[#FAF7F2] flex flex-col items-center select-none w-full">
            <span className="text-[10px] font-bold text-[#3D2216]/50 uppercase tracking-widest mb-3">Aperçu en direct de la carte publique</span>
            <div 
              className="w-full max-w-[320px] border border-[#3D2216]/20 bg-white rounded-2xl p-5 flex flex-col text-left transition-colors duration-300"
              style={{ backgroundColor: hoveredId === 'preview' && /^#[a-fA-F0-9]{6}$/.test(formBgColor) ? formBgColor : '#ffffff' }}
              onMouseEnter={() => setHoveredId('preview')}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* Badge rendering */}
              <div className="mb-2">
                <span 
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full font-sans text-[9px] font-bold uppercase tracking-wider transition-colors duration-300"
                  style={{
                    backgroundColor: hoveredId === 'preview'
                      ? (/^#[a-fA-F0-9]{6}$/.test(formBadgeTextColor) ? formBadgeTextColor : '#F9F6F0')
                      : (/^#[a-fA-F0-9]{6}$/.test(formBadgeBgColor) ? formBadgeBgColor : '#3D2216'),
                    color: hoveredId === 'preview'
                      ? (/^#[a-fA-F0-9]{6}$/.test(formBadgeBgColor) ? formBadgeBgColor : '#3D2216')
                      : (/^#[a-fA-F0-9]{6}$/.test(formBadgeTextColor) ? formBadgeTextColor : '#F9F6F0')
                  }}
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  {formBadgeText || "Création"}
                </span>
              </div>
              
              {/* Title */}
              <h4 
                className="font-sans text-xs font-black uppercase transition-colors duration-300"
                style={{ color: hoveredId === 'preview' ? '#ffffff' : '#3D2216' }}
              >
                {formName || "Tiramisu Pistache"}
              </h4>

              {/* Simulated Product Image & Description preview */}
              <div className="flex items-center gap-3 my-2">
                <div className="relative w-12 h-12 bg-[#FAF7F2] border border-[#3D2216]/10 rounded-xl overflow-hidden shrink-0">
                  <Image
                    src={formImageUrl || "/images/tiramisu_coffee_box_cropped.png"}
                    alt="Preview"
                    fill
                    sizes="48px"
                    className="object-contain p-1"
                  />
                </div>
                <span 
                  className="text-[10px] leading-tight line-clamp-2 transition-colors duration-300"
                  style={{ color: hoveredId === 'preview' ? 'rgba(255,255,255,0.85)' : 'rgba(61,34,22,0.6)' }}
                >
                  {formDescription || "Une délicieuse compotée de saveurs..."}
                </span>
              </div>

              {/* Commander button rendering */}
              <div className="mt-3 flex items-center justify-between">
                <span 
                  className="font-mono text-xs font-bold transition-colors duration-300"
                  style={{ color: hoveredId === 'preview' ? '#ffffff' : '#3D2216' }}
                >
                  {formPriceDollars ? `${formPriceDollars} CAD` : "15.00 CAD"}
                </span>
                <div 
                  className="px-4 py-1.5 font-sans text-[8px] font-bold tracking-widest uppercase rounded-full flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors duration-300"
                  style={{
                    backgroundColor: hoveredId === 'preview'
                      ? (/^#[a-fA-F0-9]{6}$/.test(formButtonTextColor) ? formButtonTextColor : '#F9F6F0')
                      : (/^#[a-fA-F0-9]{6}$/.test(formButtonBgColor) ? formButtonBgColor : '#3D2216'),
                    color: hoveredId === 'preview'
                      ? (/^#[a-fA-F0-9]{6}$/.test(formButtonBgColor) ? formButtonBgColor : '#3D2216')
                      : (/^#[a-fA-F0-9]{6}$/.test(formButtonTextColor) ? formButtonTextColor : '#F9F6F0')
                  }}
                >
                  Commander
                  <ArrowRight className="w-2.5 h-2.5" />
                </div>
              </div>
            </div>
            <span className="text-[8px] font-bold text-[#3D2216]/40 uppercase tracking-widest mt-2">Survolez la carte ci-dessus pour simuler l'effet de survol public</span>
          </div>

          {/* Ingredients Section inside Product form */}
          <div className="flex flex-col gap-3 mt-4 border-t border-[#3D2216]/10 pt-4">
            <h4 className="font-sans text-xs font-black text-[#3D2216] uppercase tracking-wider">
              Ingrédients Associés (Ordre d'affichage)
            </h4>
            <p className="text-[10px] text-[#3D2216]/60 leading-tight">
              Cochez les ingrédients à associer. Glissez-déposez les cartes d'ingrédients ci-dessous pour modifier leur ordre d'apparition.
            </p>

            {/* Checkbox selector */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
              {ingredients
                .filter((ing) => ing.is_active)
                .map((ing) => {
                  const isChecked = formIngredients.some((item) => item.id === ing.id);
                  return (
                    <label 
                      key={ing.id} 
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border border-[#3D2216]/10 cursor-pointer select-none transition-all ${isChecked ? "bg-white border-[#3D2216]/30 shadow-xs" : "bg-[#150B07]/5 hover:bg-[#150B07]/10"}`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormIngredients([...formIngredients, { id: ing.id, name: ing.name, image_url: ing.image_url }]);
                          } else {
                            setFormIngredients(formIngredients.filter((item) => item.id !== ing.id));
                          }
                        }}
                        className="rounded border-[#3D2216]/25 text-[#3D2216] focus:ring-[#C4A484]"
                      />
                      <div className="w-6 h-6 rounded-full border border-[#3D2216]/10 overflow-hidden relative shrink-0 bg-white flex items-center justify-center p-0.5">
                        <Image src={ing.image_url} alt={ing.name} fill sizes="24px" className="object-contain animate-fade-in" />
                      </div>
                      <span className="text-xs font-bold text-[#3D2216] uppercase truncate">{ing.name}</span>
                    </label>
                  );
                })}
            </div>

            {/* Draggable ordered list */}
            {formIngredients.length > 0 && (
              <div className="flex flex-col gap-2 mt-3 bg-[#FAF7F2] p-4 rounded-2xl border border-[#3D2216]/10">
                <span className="text-[10px] font-bold text-[#3D2216]/50 uppercase tracking-widest block mb-2">
                  Glisser-déposer pour trier (Visual order)
                </span>
                <div className="flex flex-wrap gap-2">
                  {formIngredients.map((ing, idx) => (
                    <div
                      key={ing.id}
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDrop={() => handleDrop(idx)}
                      className="flex items-center gap-2 p-2 bg-white border border-[#3D2216]/25 rounded-full cursor-grab active:cursor-grabbing select-none text-xs font-bold uppercase tracking-wider text-[#3D2216]"
                    >
                      <div className="w-5 h-5 rounded-full border border-[#3D2216]/10 overflow-hidden relative shrink-0 bg-[#FAF7F2] flex items-center justify-center p-0.5">
                        <Image src={ing.image_url} alt={ing.name} fill sizes="20px" className="object-contain" />
                      </div>
                      <span>{ing.name}</span>
                      <span className="text-[9px] text-[#C4A484]">#{idx + 1}</span>
                    </div>
                  ))}
                </div>

                {/* Circular live preview on public site */}
                <div className="mt-4 border-t border-[#3D2216]/10 pt-3 flex flex-col items-center">
                  <span className="text-[9px] font-bold text-[#3D2216]/40 uppercase tracking-wider mb-2">Aperçu de la section publique En savoir plus</span>
                  <div className="flex flex-wrap justify-center gap-4">
                    {formIngredients.map((ing, idx) => (
                      <div key={idx} className="flex flex-col items-center gap-1">
                        <div className="w-10 h-10 rounded-full border border-[#3D2216]/10 overflow-hidden flex items-center justify-center bg-[#FAF7F2] relative">
                          <Image src={ing.image_url} alt={ing.name} fill sizes="40px" className="object-contain p-1" />
                        </div>
                        <span className="text-[8px] font-bold text-[#3D2216] uppercase truncate max-w-[60px]">{ing.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

              {/* Allergens field */}
              <div className="flex flex-col gap-1.5 mt-2 border-t border-[#3D2216]/10 pt-4">
                <label className="text-xs font-bold text-[#3D2216] uppercase tracking-wider">
                  Notice Allergènes (Public)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Gluten, Œufs, Lait, Café (séparés par des virgules)"
                  value={formAllergens.join(", ")}
                  onChange={(e) => setFormAllergens(e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                  className="w-full bg-[#150B07]/5 border border-[#3D2216]/10 focus:border-[#C4A484] rounded-full py-3 px-6 text-sm text-[#3D2216] outline-hidden"
                />
              </div>

              {/* Taxes Customizer */}
              <div className="flex flex-col gap-3 mt-2 border-t border-[#3D2216]/10 pt-4">
                <h4 className="font-sans text-xs font-black text-[#3D2216] uppercase tracking-wider">
                  Configuration Fiscale du Produit
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-[#3D2216]/70 uppercase tracking-wide">Régime Fiscal</label>
                    <select
                      value={formTaxCategory}
                      onChange={(e) => {
                        setFormTaxCategory(e.target.value);
                        if (e.target.value === "zero-rated") {
                          setFormIsZeroRated(true);
                          setFormGstRate("0.00");
                          setFormQstRate("0.00");
                        } else {
                          setFormIsZeroRated(false);
                          setFormGstRate("0.05");
                          setFormQstRate("0.09975");
                        }
                      }}
                      className="bg-[#150B07]/5 border border-[#3D2216]/10 rounded-full py-2 px-3 text-xs outline-hidden"
                    >
                      <option value="taxable">Taxable (TPS + TVQ)</option>
                      <option value="zero-rated">Détaxé (Épicerie de base / 0%)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-[#3D2216]/70 uppercase tracking-wide">Produit Détaxé (0%)</label>
                    <label className="flex items-center gap-2 mt-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formIsZeroRated}
                        onChange={(e) => {
                          setFormIsZeroRated(e.target.checked);
                          if (e.target.checked) {
                            setFormTaxCategory("zero-rated");
                            setFormGstRate("0.00");
                            setFormQstRate("0.00");
                          } else {
                            setFormTaxCategory("taxable");
                            setFormGstRate("0.05");
                            setFormQstRate("0.09975");
                          }
                        }}
                        className="rounded border-[#3D2216]/25 text-[#3D2216] focus:ring-[#C4A484]"
                      />
                      <span className="text-xs text-[#3D2216] font-medium">Exempté de taxes</span>
                    </label>
                  </div>
                </div>

                {formTaxCategory === "taxable" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-[#3D2216]/70 uppercase tracking-wide">Taux TPS (ex: 0.05)</label>
                      <input
                        type="number"
                        step="0.001"
                        value={formGstRate}
                        onChange={(e) => setFormGstRate(e.target.value)}
                        className="bg-[#150B07]/5 border border-[#3D2216]/10 rounded-full py-2 px-3 text-xs font-mono"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-[#3D2216]/70 uppercase tracking-wide">Taux TVQ (ex: 0.09975)</label>
                      <input
                        type="number"
                        step="0.00001"
                        value={formQstRate}
                        onChange={(e) => setFormQstRate(e.target.value)}
                        className="bg-[#150B07]/5 border border-[#3D2216]/10 rounded-full py-2 px-3 text-xs font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

          {/* Status visibility */}
              <label className="flex items-center gap-3 mt-2 cursor-pointer pl-1">
                <input
                  type="checkbox"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="rounded border-[#3D2216]/25 text-[#3D2216] focus:ring-[#C4A484]"
                />
                <span className="text-xs font-bold text-[#3D2216] uppercase tracking-wider">
                  Rendre la saveur visible pour les clients (Actif)
                </span>
              </label>

              {/* Submit buttons */}
              <div className="flex items-center gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-3.5 border border-[#3D2216]/30 hover:border-[#3D2216] text-[#3D2216] font-sans text-xs font-bold tracking-widest uppercase rounded-full transition-colors cursor-pointer text-center"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={uploadProgress}
                  className="flex-1 py-3.5 bg-[#3D2216] hover:bg-[#150B07] disabled:bg-[#3D2216]/50 text-[#F9F6F0] font-sans text-xs font-bold tracking-widest uppercase rounded-full transition-all duration-300 hover:scale-102 active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                >
                  {uploadProgress ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Création en cours...
                    </>
                  ) : (
                    "Créer le produit"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* EDIT SAVEUR MODAL                          */}
      {/* ========================================== */}
      {isEditModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 bg-[#150B07]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#F9F6F0] w-full max-w-lg rounded-3xl p-8 border border-[#3D2216]/10 relative shadow-2xl overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-6 right-6 p-1.5 rounded-full hover:bg-[#3D2216]/5 text-[#3D2216] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-sans text-xl font-black text-[#3D2216] uppercase tracking-tight mb-6">
              Modifier la saveur
            </h3>

            {formError && (
              <div className="bg-[#C83E4D]/10 border border-[#C83E4D]/20 text-[#C83E4D] rounded-2xl p-4 mb-6 text-xs font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
              {/* Product name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#3D2216] uppercase tracking-wider">
                  Nom du tiramisu
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full bg-[#150B07]/5 border border-[#3D2216]/10 focus:border-[#C4A484] rounded-full py-3 px-6 text-sm text-[#3D2216] outline-hidden"
                  required
                />
              </div>

              {/* Slug */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#3D2216] uppercase tracking-wider">
                  Slug (URL)
                </label>
                <input
                  type="text"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  className="w-full bg-[#150B07]/5 border border-[#3D2216]/10 focus:border-[#C4A484] rounded-full py-3 px-6 text-sm text-[#3D2216] outline-hidden"
                  required
                />
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#3D2216] uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-[#150B07]/5 border border-[#3D2216]/10 focus:border-[#C4A484] rounded-2xl py-3 px-6 text-sm text-[#3D2216] outline-hidden min-h-[100px]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Price */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#3D2216] uppercase tracking-wider">
                    Prix (CAD $)
                  </label>
                  <input
                    type="text"
                    value={formPriceDollars}
                    onChange={(e) => setFormPriceDollars(e.target.value)}
                    className="w-full bg-[#150B07]/5 border border-[#3D2216]/10 focus:border-[#C4A484] rounded-full py-3 px-6 text-sm text-[#3D2216] outline-hidden text-center font-bold"
                    required
                  />
                </div>

                {/* Stock quantity */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#3D2216] uppercase tracking-wider">
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value)}
                    className="w-full bg-[#150B07]/5 border border-[#3D2216]/10 focus:border-[#C4A484] rounded-full py-3 px-6 text-sm text-[#3D2216] outline-hidden text-center font-bold"
                    required
                  />
                </div>

                {/* Low stock threshold */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#3D2216] uppercase tracking-wider">
                    Seuil Stock Faible
                  </label>
                  <input
                    type="number"
                    value={formThreshold}
                    onChange={(e) => setFormThreshold(e.target.value)}
                    className="w-full bg-[#150B07]/5 border border-[#3D2216]/10 focus:border-[#C4A484] rounded-full py-3 px-6 text-sm text-[#3D2216] outline-hidden text-center"
                    required
                  />
                </div>
              </div>

              {/* Image upload */}
              <div className="flex flex-col gap-1.5 mt-2">
                <label className="text-xs font-bold text-[#3D2216] uppercase tracking-wider">
                  Remplacer le visuel (Stockage Supabase)
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex-1 flex items-center justify-center gap-2 border-2 border-dashed border-[#3D2216]/25 hover:border-[#3D2216]/50 rounded-2xl py-4 bg-[#FAF7F2] hover:bg-white transition-all cursor-pointer text-xs font-bold uppercase tracking-wider text-[#3D2216]/60">
                    <Upload className="w-4 h-4" />
                    {formImageFile ? formImageFile.name : "Téléverser une nouvelle image"}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          setFormImageFile(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

          {/* Background Color Picker */}
          <div className="flex flex-col gap-1.5 mt-2">
            <label className="text-xs font-bold text-[#3D2216] uppercase tracking-wider">
              Couleur du fond (Public)
            </label>
            <div className="flex items-center gap-4">
              <div className="relative w-12 h-12 rounded-full overflow-hidden border border-[#3D2216]/15 shrink-0 cursor-pointer shadow-xs">
                <input
                  type="color"
                  value={formBgColor}
                  onChange={(e) => setFormBgColor(e.target.value.toUpperCase())}
                  className="absolute -inset-2 w-16 h-16 cursor-pointer border-0 p-0"
                />
              </div>
              <input
                type="text"
                placeholder="#6B3F2A"
                value={formBgColor}
                onChange={(e) => setFormBgColor(e.target.value)}
                className="w-full bg-[#150B07]/5 border border-[#3D2216]/10 focus:border-[#C4A484] rounded-full py-3 px-6 text-sm text-[#3D2216] outline-hidden font-mono uppercase"
                maxLength={7}
                required
              />
            </div>
          </div>

          {/* Badge Customizer */}
          <div className="flex flex-col gap-3 mt-3 border-t border-[#3D2216]/10 pt-4">
            <h4 className="font-sans text-xs font-black text-[#3D2216] uppercase tracking-wider">
              Personnalisation du Badge (Public)
            </h4>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-[#3D2216]/70 uppercase tracking-wide">Texte du badge</label>
              <input
                type="text"
                placeholder="Ex: Création"
                value={formBadgeText}
                onChange={(e) => setFormBadgeText(e.target.value)}
                className="w-full bg-[#150B07]/5 border border-[#3D2216]/10 focus:border-[#C4A484] rounded-full py-3 px-6 text-xs text-[#3D2216] outline-hidden"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-[#3D2216]/70 uppercase tracking-wide">Fond du badge</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formBadgeBgColor}
                    onChange={(e) => setFormBadgeBgColor(e.target.value.toUpperCase())}
                    className="w-8 h-8 rounded-full border border-[#3D2216]/15 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formBadgeBgColor}
                    onChange={(e) => setFormBadgeBgColor(e.target.value)}
                    className="w-full bg-[#150B07]/5 border border-[#3D2216]/10 rounded-full py-2 px-3 text-xs font-mono uppercase"
                    maxLength={7}
                    required
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-[#3D2216]/70 uppercase tracking-wide">Texte / Symboles</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formBadgeTextColor}
                    onChange={(e) => setFormBadgeTextColor(e.target.value.toUpperCase())}
                    className="w-8 h-8 rounded-full border border-[#3D2216]/15 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formBadgeTextColor}
                    onChange={(e) => setFormBadgeTextColor(e.target.value)}
                    className="w-full bg-[#150B07]/5 border border-[#3D2216]/10 rounded-full py-2 px-3 text-xs font-mono uppercase"
                    maxLength={7}
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Commander Button Customizer */}
          <div className="flex flex-col gap-3 mt-3 border-t border-[#3D2216]/10 pt-4">
            <h4 className="font-sans text-xs font-black text-[#3D2216] uppercase tracking-wider">
              Bouton Commander (Public)
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-[#3D2216]/70 uppercase tracking-wide">Fond du bouton</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formButtonBgColor}
                    onChange={(e) => setFormButtonBgColor(e.target.value.toUpperCase())}
                    className="w-8 h-8 rounded-full border border-[#3D2216]/15 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formButtonBgColor}
                    onChange={(e) => setFormButtonBgColor(e.target.value)}
                    className="w-full bg-[#150B07]/5 border border-[#3D2216]/10 rounded-full py-2 px-3 text-xs font-mono uppercase"
                    maxLength={7}
                    required
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-[#3D2216]/70 uppercase tracking-wide">Texte du bouton</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formButtonTextColor}
                    onChange={(e) => setFormButtonTextColor(e.target.value.toUpperCase())}
                    className="w-8 h-8 rounded-full border border-[#3D2216]/15 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formButtonTextColor}
                    onChange={(e) => setFormButtonTextColor(e.target.value)}
                    className="w-full bg-[#150B07]/5 border border-[#3D2216]/10 rounded-full py-2 px-3 text-xs font-mono uppercase"
                    maxLength={7}
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Live Responsive Preview */}
          <div className="mt-4 p-4 border border-[#3D2216]/10 rounded-2xl bg-[#FAF7F2] flex flex-col items-center select-none w-full">
            <span className="text-[10px] font-bold text-[#3D2216]/50 uppercase tracking-widest mb-3">Aperçu en direct de la carte publique</span>
            <div 
              className="w-full max-w-[320px] border border-[#3D2216]/20 bg-white rounded-2xl p-5 flex flex-col text-left transition-colors duration-300"
              style={{ backgroundColor: hoveredId === 'preview-edit' && /^#[a-fA-F0-9]{6}$/.test(formBgColor) ? formBgColor : '#ffffff' }}
              onMouseEnter={() => setHoveredId('preview-edit')}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* Badge rendering */}
              <div className="mb-2">
                <span 
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full font-sans text-[9px] font-bold uppercase tracking-wider transition-colors duration-300"
                  style={{
                    backgroundColor: hoveredId === 'preview-edit'
                      ? (/^#[a-fA-F0-9]{6}$/.test(formBadgeTextColor) ? formBadgeTextColor : '#F9F6F0')
                      : (/^#[a-fA-F0-9]{6}$/.test(formBadgeBgColor) ? formBadgeBgColor : '#3D2216'),
                    color: hoveredId === 'preview-edit'
                      ? (/^#[a-fA-F0-9]{6}$/.test(formBadgeBgColor) ? formBadgeBgColor : '#3D2216')
                      : (/^#[a-fA-F0-9]{6}$/.test(formBadgeTextColor) ? formBadgeTextColor : '#F9F6F0')
                  }}
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  {formBadgeText || "Création"}
                </span>
              </div>
              
              {/* Title */}
              <h4 
                className="font-sans text-xs font-black uppercase transition-colors duration-300"
                style={{ color: hoveredId === 'preview-edit' ? '#ffffff' : '#3D2216' }}
              >
                {formName || "Tiramisu Pistache"}
              </h4>

              {/* Simulated Product Image & Description preview */}
              <div className="flex items-center gap-3 my-2">
                <div className="relative w-12 h-12 bg-[#FAF7F2] border border-[#3D2216]/10 rounded-xl overflow-hidden shrink-0">
                  <Image
                    src={formImageUrl || "/images/tiramisu_coffee_box_cropped.png"}
                    alt="Preview"
                    fill
                    sizes="48px"
                    className="object-contain p-1"
                  />
                </div>
                <span 
                  className="text-[10px] leading-tight line-clamp-2 transition-colors duration-300"
                  style={{ color: hoveredId === 'preview-edit' ? 'rgba(255,255,255,0.85)' : 'rgba(61,34,22,0.6)' }}
                >
                  {formDescription || "Une délicieuse compotée de saveurs..."}
                </span>
              </div>

              {/* Commander button rendering */}
              <div className="mt-3 flex items-center justify-between">
                <span 
                  className="font-mono text-xs font-bold transition-colors duration-300"
                  style={{ color: hoveredId === 'preview-edit' ? '#ffffff' : '#3D2216' }}
                >
                  {formPriceDollars ? `${formPriceDollars} CAD` : "15.00 CAD"}
                </span>
                <div 
                  className="px-4 py-1.5 font-sans text-[8px] font-bold tracking-widest uppercase rounded-full flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors duration-300"
                  style={{
                    backgroundColor: hoveredId === 'preview-edit'
                      ? (/^#[a-fA-F0-9]{6}$/.test(formButtonTextColor) ? formButtonTextColor : '#F9F6F0')
                      : (/^#[a-fA-F0-9]{6}$/.test(formButtonBgColor) ? formButtonBgColor : '#3D2216'),
                    color: hoveredId === 'preview-edit'
                      ? (/^#[a-fA-F0-9]{6}$/.test(formButtonBgColor) ? formButtonBgColor : '#3D2216')
                      : (/^#[a-fA-F0-9]{6}$/.test(formButtonTextColor) ? formButtonTextColor : '#F9F6F0')
                  }}
                >
                  Commander
                  <ArrowRight className="w-2.5 h-2.5" />
                </div>
              </div>
            </div>
            <span className="text-[8px] font-bold text-[#3D2216]/40 uppercase tracking-widest mt-2">Survolez la carte ci-dessus pour simuler l'effet de survol public</span>
          </div>

          {/* Ingredients Section inside Product form */}
          <div className="flex flex-col gap-3 mt-4 border-t border-[#3D2216]/10 pt-4">
            <h4 className="font-sans text-xs font-black text-[#3D2216] uppercase tracking-wider">
              Ingrédients Associés (Ordre d'affichage)
            </h4>
            <p className="text-[10px] text-[#3D2216]/60 leading-tight">
              Cochez les ingrédients à associer. Glissez-déposez les cartes d'ingrédients ci-dessous pour modifier leur ordre d'apparition.
            </p>

            {/* Checkbox selector */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
              {ingredients
                .filter((ing) => ing.is_active)
                .map((ing) => {
                  const isChecked = formIngredients.some((item) => item.id === ing.id);
                  return (
                    <label 
                      key={ing.id} 
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border border-[#3D2216]/10 cursor-pointer select-none transition-all ${isChecked ? "bg-white border-[#3D2216]/30 shadow-xs" : "bg-[#150B07]/5 hover:bg-[#150B07]/10"}`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormIngredients([...formIngredients, { id: ing.id, name: ing.name, image_url: ing.image_url }]);
                          } else {
                            setFormIngredients(formIngredients.filter((item) => item.id !== ing.id));
                          }
                        }}
                        className="rounded border-[#3D2216]/25 text-[#3D2216] focus:ring-[#C4A484]"
                      />
                      <div className="w-6 h-6 rounded-full border border-[#3D2216]/10 overflow-hidden relative shrink-0 bg-white flex items-center justify-center p-0.5">
                        <Image src={ing.image_url} alt={ing.name} fill sizes="24px" className="object-contain animate-fade-in" />
                      </div>
                      <span className="text-xs font-bold text-[#3D2216] uppercase truncate">{ing.name}</span>
                    </label>
                  );
                })}
            </div>

            {/* Draggable ordered list */}
            {formIngredients.length > 0 && (
              <div className="flex flex-col gap-2 mt-3 bg-[#FAF7F2] p-4 rounded-2xl border border-[#3D2216]/10">
                <span className="text-[10px] font-bold text-[#3D2216]/50 uppercase tracking-widest block mb-2">
                  Glisser-déposer pour trier (Visual order)
                </span>
                <div className="flex flex-wrap gap-2">
                  {formIngredients.map((ing, idx) => (
                    <div
                      key={ing.id}
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDrop={() => handleDrop(idx)}
                      className="flex items-center gap-2 p-2 bg-white border border-[#3D2216]/25 rounded-full cursor-grab active:cursor-grabbing select-none text-xs font-bold uppercase tracking-wider text-[#3D2216]"
                    >
                      <div className="w-5 h-5 rounded-full border border-[#3D2216]/10 overflow-hidden relative shrink-0 bg-[#FAF7F2] flex items-center justify-center p-0.5">
                        <Image src={ing.image_url} alt={ing.name} fill sizes="20px" className="object-contain" />
                      </div>
                      <span>{ing.name}</span>
                      <span className="text-[9px] text-[#C4A484]">#{idx + 1}</span>
                    </div>
                  ))}
                </div>

                {/* Circular live preview on public site */}
                <div className="mt-4 border-t border-[#3D2216]/10 pt-3 flex flex-col items-center">
                  <span className="text-[9px] font-bold text-[#3D2216]/40 uppercase tracking-wider mb-2">Aperçu de la section publique En savoir plus</span>
                  <div className="flex flex-wrap justify-center gap-4">
                    {formIngredients.map((ing, idx) => (
                      <div key={idx} className="flex flex-col items-center gap-1">
                        <div className="w-10 h-10 rounded-full border border-[#3D2216]/10 overflow-hidden flex items-center justify-center bg-[#FAF7F2] relative">
                          <Image src={ing.image_url} alt={ing.name} fill sizes="40px" className="object-contain p-1" />
                        </div>
                        <span className="text-[8px] font-bold text-[#3D2216] uppercase truncate max-w-[60px]">{ing.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

              {/* Allergens field */}
              <div className="flex flex-col gap-1.5 mt-2 border-t border-[#3D2216]/10 pt-4">
                <label className="text-xs font-bold text-[#3D2216] uppercase tracking-wider">
                  Notice Allergènes (Public)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Gluten, Œufs, Lait, Café (séparés par des virgules)"
                  value={formAllergens.join(", ")}
                  onChange={(e) => setFormAllergens(e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                  className="w-full bg-[#150B07]/5 border border-[#3D2216]/10 focus:border-[#C4A484] rounded-full py-3 px-6 text-sm text-[#3D2216] outline-hidden"
                />
              </div>

              {/* Taxes Customizer */}
              <div className="flex flex-col gap-3 mt-2 border-t border-[#3D2216]/10 pt-4">
                <h4 className="font-sans text-xs font-black text-[#3D2216] uppercase tracking-wider">
                  Configuration Fiscale du Produit
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-[#3D2216]/70 uppercase tracking-wide">Régime Fiscal</label>
                    <select
                      value={formTaxCategory}
                      onChange={(e) => {
                        setFormTaxCategory(e.target.value);
                        if (e.target.value === "zero-rated") {
                          setFormIsZeroRated(true);
                          setFormGstRate("0.00");
                          setFormQstRate("0.00");
                        } else {
                          setFormIsZeroRated(false);
                          setFormGstRate("0.05");
                          setFormQstRate("0.09975");
                        }
                      }}
                      className="bg-[#150B07]/5 border border-[#3D2216]/10 rounded-full py-2 px-3 text-xs outline-hidden"
                    >
                      <option value="taxable">Taxable (TPS + TVQ)</option>
                      <option value="zero-rated">Détaxé (Épicerie de base / 0%)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-[#3D2216]/70 uppercase tracking-wide">Produit Détaxé (0%)</label>
                    <label className="flex items-center gap-2 mt-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formIsZeroRated}
                        onChange={(e) => {
                          setFormIsZeroRated(e.target.checked);
                          if (e.target.checked) {
                            setFormTaxCategory("zero-rated");
                            setFormGstRate("0.00");
                            setFormQstRate("0.00");
                          } else {
                            setFormTaxCategory("taxable");
                            setFormGstRate("0.05");
                            setFormQstRate("0.09975");
                          }
                        }}
                        className="rounded border-[#3D2216]/25 text-[#3D2216] focus:ring-[#C4A484]"
                      />
                      <span className="text-xs text-[#3D2216] font-medium">Exempté de taxes</span>
                    </label>
                  </div>
                </div>

                {formTaxCategory === "taxable" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-[#3D2216]/70 uppercase tracking-wide">Taux TPS (ex: 0.05)</label>
                      <input
                        type="number"
                        step="0.001"
                        value={formGstRate}
                        onChange={(e) => setFormGstRate(e.target.value)}
                        className="bg-[#150B07]/5 border border-[#3D2216]/10 rounded-full py-2 px-3 text-xs font-mono"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-[#3D2216]/70 uppercase tracking-wide">Taux TVQ (ex: 0.09975)</label>
                      <input
                        type="number"
                        step="0.00001"
                        value={formQstRate}
                        onChange={(e) => setFormQstRate(e.target.value)}
                        className="bg-[#150B07]/5 border border-[#3D2216]/10 rounded-full py-2 px-3 text-xs font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

          {/* Status visibility */}
              <label className="flex items-center gap-3 mt-2 cursor-pointer pl-1">
                <input
                  type="checkbox"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="rounded border-[#3D2216]/25 text-[#3D2216] focus:ring-[#C4A484]"
                />
                <span className="text-xs font-bold text-[#3D2216] uppercase tracking-wider">
                  Rendre la saveur visible pour les clients (Actif)
                </span>
              </label>

              {/* Submit buttons */}
              <div className="flex items-center gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-3.5 border border-[#3D2216]/30 hover:border-[#3D2216] text-[#3D2216] font-sans text-xs font-bold tracking-widest uppercase rounded-full transition-colors cursor-pointer text-center"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={uploadProgress}
                  className="flex-1 py-3.5 bg-[#3D2216] hover:bg-[#150B07] disabled:bg-[#3D2216]/50 text-[#F9F6F0] font-sans text-xs font-bold tracking-widest uppercase rounded-full transition-all duration-300 hover:scale-102 active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                >
                  {uploadProgress ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Mise à jour...
                    </>
                  ) : (
                    "Mettre à jour"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ========================================== */}
      {/* ADD INGREDIENT MODAL                       */}
      {/* ========================================== */}
      {isAddIngModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#150B07]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#F9F6F0] w-full max-w-md rounded-3xl p-8 border border-[#3D2216]/10 relative shadow-2xl overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setIsAddIngModalOpen(false)}
              className="absolute top-6 right-6 p-1.5 rounded-full hover:bg-[#3D2216]/5 text-[#3D2216] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-sans text-xl font-black text-[#3D2216] uppercase tracking-tight mb-6">
              Créer un ingrédient
            </h3>

            {ingFormError && (
              <div className="bg-[#C83E4D]/10 border border-[#C83E4D]/20 text-[#C83E4D] rounded-2xl p-4 mb-6 text-xs font-semibold">
                {ingFormError}
              </div>
            )}

            <form onSubmit={handleAddIngSubmit} className="flex flex-col gap-4">
              {/* Ingredient Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#3D2216] uppercase tracking-wider">
                  Nom de l'ingrédient
                </label>
                <input
                  type="text"
                  placeholder="Ex: Pistache"
                  value={formIngName}
                  onChange={(e) => setFormIngName(e.target.value)}
                  className="w-full bg-[#150B07]/5 border border-[#3D2216]/10 focus:border-[#C4A484] rounded-full py-3 px-6 text-sm text-[#3D2216] outline-hidden"
                  required
                />
              </div>

              {/* Slug */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#3D2216] uppercase tracking-wider">
                  Slug unique
                </label>
                <input
                  type="text"
                  placeholder="Ex: pistachio (généré si vide)"
                  value={formIngSlug}
                  onChange={(e) => setFormIngSlug(e.target.value)}
                  className="w-full bg-[#150B07]/5 border border-[#3D2216]/10 focus:border-[#C4A484] rounded-full py-3 px-6 text-sm text-[#3D2216] outline-hidden"
                />
              </div>

              {/* Image Input Selection */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#3D2216] uppercase tracking-wider">
                  Image (Fichier ou URL)
                </label>
                <div className="flex flex-col gap-2">
                  {/* File upload */}
                  <label className="flex items-center justify-center gap-2 border-2 border-dashed border-[#3D2216]/25 hover:border-[#3D2216]/50 rounded-2xl py-3 bg-[#FAF7F2] hover:bg-white transition-all cursor-pointer text-xs font-bold uppercase tracking-wider text-[#3D2216]/60">
                    <Upload className="w-4 h-4" />
                    {formIngImageFile ? formIngImageFile.name : "Téléverser une image"}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          setFormIngImageFile(e.target.files[0]);
                          setFormIngImageUrl(""); // clear URL if file uploaded
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                  {/* Text URL input */}
                  <input
                    type="text"
                    placeholder="Ou collez une URL d'image existante"
                    value={formIngImageUrl}
                    onChange={(e) => {
                      setFormIngImageUrl(e.target.value);
                      setFormIngImageFile(null); // clear file if URL provided
                    }}
                    className="w-full bg-[#150B07]/5 border border-[#3D2216]/10 focus:border-[#C4A484] rounded-full py-3 px-6 text-sm text-[#3D2216] outline-hidden"
                  />
                </div>
              </div>

              {/* Status active */}
              <label className="flex items-center gap-3 mt-2 cursor-pointer pl-1">
                <input
                  type="checkbox"
                  checked={formIngActive}
                  onChange={(e) => setFormIngActive(e.target.checked)}
                  className="rounded border-[#3D2216]/25 text-[#3D2216] focus:ring-[#C4A484]"
                />
                <span className="text-xs font-bold text-[#3D2216] uppercase tracking-wider">
                  Ingrédient Actif (Disponible)
                </span>
              </label>

              {/* Submit Buttons */}
              <div className="flex items-center gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsAddIngModalOpen(false)}
                  className="flex-1 py-3.5 border border-[#3D2216]/30 hover:border-[#3D2216] text-[#3D2216] font-sans text-xs font-bold tracking-widest uppercase rounded-full transition-colors cursor-pointer text-center"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={uploadProgress}
                  className="flex-1 py-3.5 bg-[#3D2216] hover:bg-[#150B07] disabled:bg-[#3D2216]/50 text-[#F9F6F0] font-sans text-xs font-bold tracking-widest uppercase rounded-full transition-all duration-300 hover:scale-102 active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                >
                  {uploadProgress ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Création...
                    </>
                  ) : (
                    "Créer"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* EDIT INGREDIENT MODAL                      */}
      {/* ========================================== */}
      {isEditIngModalOpen && selectedIng && (
        <div className="fixed inset-0 z-50 bg-[#150B07]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#F9F6F0] w-full max-w-md rounded-3xl p-8 border border-[#3D2216]/10 relative shadow-2xl overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setIsEditIngModalOpen(false)}
              className="absolute top-6 right-6 p-1.5 rounded-full hover:bg-[#3D2216]/5 text-[#3D2216] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-sans text-xl font-black text-[#3D2216] uppercase tracking-tight mb-6">
              Modifier l'ingrédient
            </h3>

            {ingFormError && (
              <div className="bg-[#C83E4D]/10 border border-[#C83E4D]/20 text-[#C83E4D] rounded-2xl p-4 mb-6 text-xs font-semibold">
                {ingFormError}
              </div>
            )}

            <form onSubmit={handleEditIngSubmit} className="flex flex-col gap-4">
              {/* Ingredient Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#3D2216] uppercase tracking-wider">
                  Nom de l'ingrédient
                </label>
                <input
                  type="text"
                  value={formIngName}
                  onChange={(e) => setFormIngName(e.target.value)}
                  className="w-full bg-[#150B07]/5 border border-[#3D2216]/10 focus:border-[#C4A484] rounded-full py-3 px-6 text-sm text-[#3D2216] outline-hidden"
                  required
                />
              </div>

              {/* Slug */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#3D2216] uppercase tracking-wider">
                  Slug unique
                </label>
                <input
                  type="text"
                  value={formIngSlug}
                  onChange={(e) => setFormIngSlug(e.target.value)}
                  className="w-full bg-[#150B07]/5 border border-[#3D2216]/10 focus:border-[#C4A484] rounded-full py-3 px-6 text-sm text-[#3D2216] outline-hidden"
                  required
                />
              </div>

              {/* Image Input Selection */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#3D2216] uppercase tracking-wider">
                  Image (Fichier ou URL)
                </label>
                <div className="flex flex-col gap-2">
                  {/* File upload */}
                  <label className="flex items-center justify-center gap-2 border-2 border-dashed border-[#3D2216]/25 hover:border-[#3D2216]/50 rounded-2xl py-3 bg-[#FAF7F2] hover:bg-white transition-all cursor-pointer text-xs font-bold uppercase tracking-wider text-[#3D2216]/60">
                    <Upload className="w-4 h-4" />
                    {formIngImageFile ? formIngImageFile.name : "Téléverser une nouvelle image"}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          setFormIngImageFile(e.target.files[0]);
                          setFormIngImageUrl(""); // clear URL if file uploaded
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                  {/* Text URL input */}
                  <input
                    type="text"
                    placeholder="Ou collez une URL d'image existante"
                    value={formIngImageUrl}
                    onChange={(e) => {
                      setFormIngImageUrl(e.target.value);
                      setFormIngImageFile(null); // clear file if URL provided
                    }}
                    className="w-full bg-[#150B07]/5 border border-[#3D2216]/10 focus:border-[#C4A484] rounded-full py-3 px-6 text-sm text-[#3D2216] outline-hidden"
                  />
                </div>
              </div>

              {/* Status active */}
              <label className="flex items-center gap-3 mt-2 cursor-pointer pl-1">
                <input
                  type="checkbox"
                  checked={formIngActive}
                  onChange={(e) => setFormIngActive(e.target.checked)}
                  className="rounded border-[#3D2216]/25 text-[#3D2216] focus:ring-[#C4A484]"
                />
                <span className="text-xs font-bold text-[#3D2216] uppercase tracking-wider">
                  Ingrédient Actif (Disponible)
                </span>
              </label>

              {/* Submit Buttons */}
              <div className="flex items-center gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsEditIngModalOpen(false)}
                  className="flex-1 py-3.5 border border-[#3D2216]/30 hover:border-[#3D2216] text-[#3D2216] font-sans text-xs font-bold tracking-widest uppercase rounded-full transition-colors cursor-pointer text-center"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={uploadProgress}
                  className="flex-1 py-3.5 bg-[#3D2216] hover:bg-[#150B07] disabled:bg-[#3D2216]/50 text-[#F9F6F0] font-sans text-xs font-bold tracking-widest uppercase rounded-full transition-all duration-300 hover:scale-102 active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                >
                  {uploadProgress ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    "Enregistrer"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
