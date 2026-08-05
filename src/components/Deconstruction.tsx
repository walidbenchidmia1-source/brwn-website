"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, X, Check, Coffee, Shell, Leaf, Flame, Star, Sparkles, Heart, Loader, ShoppingBag, CheckCircle2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useCart } from "@/context/CartContext";
import HalalIcon from "@/components/HalalIcon";

interface Ingredient {
  name: string;
  desc: string;
  icon: React.ReactNode;
}

interface Product {
  id: string;
  name: string;
  badge: string;
  badgeIcon: React.ReactNode;
  description: string;
  image: string;
  colorClass: string;
  badgeClass: string;
  buttonClass: string;
  recipeTitle: string;
  recipeIngredients: Ingredient[];
}

export default function Deconstruction() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [activeRecipeProduct, setActiveRecipeProduct] = useState<any | null>(null);
  const [activeOrderProduct, setActiveOrderProduct] = useState<any | null>(null);
  const [email, setEmail] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const { addItem } = useCart();
  const [selectedFormat, setSelectedFormat] = useState("Le Solo");
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  const openOrderModal = (product: any) => {
    setSelectedFormat("Le Solo");
    setOrderQuantity(1);
    setIsAdded(false);
    setIsAdding(false);
    setActiveOrderProduct(product);
  };

  const supabase = createClient();

  const FALLBACK_PRODUCTS = [
    {
      id: "coffee",
      name: "L'Original Coffee Tiramisu",
      slug: "coffee",
      description: "Une base fondante de biscuits cuillères imbibés d'un espresso de spécialité (mélange éthiopien aux notes chocolatées), recouverte d'une crème mascarpone fouettée à la vanille Bourbon de Madagascar, couronnée d'un saupoudrage de cacao noir velouté.",
      image_url: "/images/tiramisu_coffee_box_cropped.png",
      is_active: true,
      background_color: "#3D2216"
    },
    {
      id: "strawberry",
      name: "Le Tiramisu Fraise",
      slug: "strawberry",
      description: "Une déclinaison fruitée alliant le crémeux du mascarpone à la fraîcheur d'un coulis de fraises fraîches de saison, sur un lit de biscuits cuillères délicatement imbibés d'un sirop vanillé et présentés dans un écrin métallique premium.",
      image_url: "/images/tiramisu_strawberry_cropped.png",
      is_active: true,
      background_color: "#C83E4D"
    },
    {
      id: "mango",
      name: "Le Tiramisu Mangue",
      slug: "mango",
      description: "Un voyage exotique mariant la douceur d'une compotée de mangues mûres à point avec notre crème mascarpone veloutée, pour un équilibre parfait entre fraîcheur et gourmandise sous un format boîte de conserve moderne.",
      image_url: "/images/tiramisu_mango_cropped.png",
      is_active: true,
      background_color: "#E2903F"
    }
  ];

  // Map dynamic product slug to UI styles & recipe details
  const getProductStyles = (slug: string) => {
    const s = slug.toLowerCase();
    if (s.includes("coffee") || s.includes("cafe")) {
      return {
        badge: "En Vedette",
        badgeIcon: <Star className="w-3 h-3" />,
        colorClass: "hover:bg-[#3D2216]",
        badgeClass: "bg-[#3D2216] text-[#F9F6F0] group-hover:bg-[#F9F6F0] group-hover:text-[#3D2216]",
        buttonClass: "bg-[#3D2216] group-hover:bg-[#F9F6F0] text-[#F9F6F0] group-hover:text-[#3D2216] hover:bg-[#150B07] group-hover:hover:bg-[#EADDC9]",
        recipeTitle: "Secrets de Préparation",
        recipeIngredients: [
          { name: "Espresso Single-Origin", desc: "Mélange éthiopien de spécialité, torréfié délicatement pour exprimer des notes de fruits rouges et de cacao.", icon: <Coffee className="w-5 h-5" /> },
          { name: "Mascarpone Crémeux", desc: "Directement importé de Lombardie, offrant une onctuosité, une tenue et une douceur sans égal.", icon: <Shell className="w-5 h-5" /> },
          { name: "Vanille de Madagascar", desc: "Infusée lentement pour libérer ses huiles essentielles boisées et sucrées dans le mascarpone.", icon: <Flame className="w-5 h-5" /> },
          { name: "Cacao Grand Cru", desc: "Un saupoudrage dense de cacao alcalinisé hollandais, sans amertume agressive.", icon: <Leaf className="w-5 h-5" /> }
        ]
      };
    } else if (s.includes("strawberry") || s.includes("fraise")) {
      return {
        badge: "Nouveauté",
        badgeIcon: <Sparkles className="w-3 h-3" />,
        colorClass: "hover:bg-[#C83E4D]",
        badgeClass: "bg-[#C83E4D] text-[#F9F6F0] group-hover:bg-[#F9F6F0] group-hover:text-[#C83E4D]",
        buttonClass: "bg-[#C83E4D] group-hover:bg-[#F9F6F0] text-[#F9F6F0] group-hover:text-[#C83E4D] hover:bg-[#9E2A37] group-hover:hover:bg-[#EADDC9]",
        recipeTitle: "Fraîcheur de Saison",
        recipeIngredients: [
          { name: "Fraises Gariguette", desc: "Fraises fraîches sélectionnées pour leur parfum intense et leur juste équilibre acidulé.", icon: <Sparkles className="w-5 h-5" /> },
          { name: "Mascarpone Fouetté", desc: "Notre crème mascarpone signature rehaussée d'une touche de vanille Bourbon naturelle.", icon: <Shell className="w-5 h-5" /> },
          { name: "Sirop de Vanille Doux", desc: "Biscuits cuillères délicatement imbibés d'un sirop léger infusé à la vanille de Madagascar.", icon: <Flame className="w-5 h-5" /> },
          { name: "Coulis de Saison", desc: "Un coulis de fraises maison, préparé avec passion pour préserver toute la fraîcheur du fruit.", icon: <Leaf className="w-5 h-5" /> }
        ]
      };
    } else if (s.includes("mango") || s.includes("mangue")) {
      return {
        badge: "Saison",
        badgeIcon: <Heart className="w-3 h-3" />,
        colorClass: "hover:bg-[#D97706]",
        badgeClass: "bg-[#D97706] text-[#F9F6F0] group-hover:bg-[#F9F6F0] group-hover:text-[#D97706]",
        buttonClass: "bg-[#D97706] group-hover:bg-[#F9F6F0] text-[#F9F6F0] group-hover:text-[#D97706] hover:bg-[#B45309] group-hover:hover:bg-[#EADDC9]",
        recipeTitle: "Voyage Exotique",
        recipeIngredients: [
          { name: "Mangues Alphonso", desc: "Mangues charnues et sucrées, réputées pour leur texture veloutée et leur saveur unique.", icon: <Sparkles className="w-5 h-5" /> },
          { name: "Mascarpone Onctueux", desc: "Notre crème fouettée maison, offrant un écrin de douceur aux fruits exotiques.", icon: <Shell className="w-5 h-5" /> },
          { name: "Biscuit Sirop Coco", desc: "Biscuits cuillères délicatement imbibés d'un jus coco-vanille léger pour une touche d'évasion.", icon: <Flame className="w-5 h-5" /> },
          { name: "Zestes de Citron Vert", desc: "Une pointe de zestes de citron vert bio pour réveiller et sublimer la sucrosité de la mangue.", icon: <Leaf className="w-5 h-5" /> }
        ]
      };
    } else {
      return {
        badge: "Création",
        badgeIcon: <Sparkles className="w-3 h-3" />,
        colorClass: "hover:bg-[#5C3D2E]",
        badgeClass: "bg-[#5C3D2E] text-[#F9F6F0] group-hover:bg-[#F9F6F0] group-hover:text-[#5C3D2E]",
        buttonClass: "bg-[#5C3D2E] group-hover:bg-[#F9F6F0] text-[#F9F6F0] group-hover:text-[#5C3D2E] hover:bg-[#3D2216] group-hover:hover:bg-[#EADDC9]",
        recipeTitle: "Recette Pâtissière",
        recipeIngredients: [
          { name: "Matières Nobles", desc: "Ingrédients premium sourcés localement et travaillés avec amour.", icon: <Sparkles className="w-5 h-5" /> },
          { name: "Mascarpone Signature", desc: "Notre crème fouettée signature rehaussée d'une touche de vanille naturelle.", icon: <Shell className="w-5 h-5" /> },
          { name: "Biscuits Moelleux", desc: "Biscuits cuillères de qualité pâtissière imbibés avec précision.", icon: <Flame className="w-5 h-5" /> },
          { name: "Finitions Délicates", desc: "Une touche finale soignée pour flatter le palais.", icon: <Leaf className="w-5 h-5" /> }
        ]
      };
    }
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("is_active", true)
          .order("name", { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          setProducts(data);
        } else {
          if (process.env.NODE_ENV === "development") {
            setProducts(FALLBACK_PRODUCTS);
          } else {
            setProducts([]);
          }
        }
      } catch (err) {
        console.error("Database fetch error:", err);
        if (process.env.NODE_ENV === "development") {
          setProducts(FALLBACK_PRODUCTS);
        } else {
          setProducts([]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, [supabase]);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setIsSubscribed(true);
      setTimeout(() => {
        setIsSubscribed(false);
        setActiveOrderProduct(null);
        setEmail("");
      }, 2500);
    }
  };

  return (
    <section
      id="deconstruction"
      className="relative min-h-screen w-full bg-[#FAF7F2] flex flex-col justify-center items-center py-24 px-6 overflow-hidden border-b border-[#3D2216]/5"
    >
      <div className="text-center mb-20 z-10 px-6">
        <span className="font-sans text-xs md:text-sm font-semibold tracking-[0.3em] text-[#C4A484] uppercase">
          La Collection
        </span>
        <h2 className="font-sans text-4xl md:text-6xl text-[#3D2216] font-black uppercase tracking-tighter mt-2">
          Les Recettes Signature
        </h2>
        <p className="font-sans text-sm text-[#3D2216]/60 max-w-xl mx-auto mt-4 font-light">
          Découvrez notre trilogie de tiramisus gourmands, élaborés quotidiennement par nos maîtres artisans.
        </p>
      </div>

      {isLoading ? (
        <div className="py-24 text-center flex flex-col items-center gap-4 z-10">
          <Loader className="w-8 h-8 animate-spin text-[#C4A484]" />
          <span className="text-xs uppercase tracking-widest font-bold text-[#3D2216]/60">Chargement de la carte...</span>
        </div>
      ) : (
        <div className="w-full flex flex-col gap-24 items-center max-w-5xl z-10">
          {products.map((product) => {
            const styles = getProductStyles(product.slug);
            const isOutOfStock = product.stock_quantity === 0;

            const isValidHex = (color: string) => /^#[a-fA-F0-9]{6}$/.test(color);
            const cardBgColor = hoveredId === product.id 
              ? (product.background_color && isValidHex(product.background_color) ? product.background_color : "#6B3F2A") 
              : "transparent";

            return (
              <div
                key={product.id}
                onMouseEnter={() => setHoveredId(product.id)}
                onMouseLeave={() => setHoveredId(null)}
                className="group relative w-full flex flex-col md:flex-row items-center justify-between bg-transparent rounded-3xl p-5 md:p-12 md:py-16 md:pl-8 md:pr-16 transition-all duration-500 hover:shadow-2xl"
                style={{ backgroundColor: cardBgColor }}
              >
                <div className="relative w-full md:w-1/2 flex justify-center items-center h-auto mb-4 md:mb-0">
                  <div
                    className="relative w-full h-[260px] sm:h-[320px] md:w-[720px] md:h-[720px] md:-mt-56 md:-mb-56 md:-ml-20 flex items-center justify-center transition-all duration-500 group-hover:scale-105 group-hover:-translate-y-2 filter drop-shadow-xl"
                  >
                    <div className="relative w-full h-full">
                      <Image
                        src={product.image_url || "/images/tiramisu_coffee_box_cropped.png"}
                        alt={product.name}
                        fill
                        sizes="(max-width: 768px) 100vw, 720px"
                        quality={85}
                        className="object-contain"
                      />
                    </div>
                  </div>
                </div>
                <div className="w-full md:w-1/2 flex flex-col text-left md:pl-8">
                  <div className="mb-2 md:mb-4 flex flex-wrap gap-2 items-center">
                    <span 
                      className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full font-sans text-[10px] font-bold uppercase tracking-wider transition-colors duration-500"
                      style={{
                        backgroundColor: hoveredId === product.id
                          ? (product.badge_text_color || '#F9F6F0')
                          : (product.badge_bg_color || '#3D2216'),
                        color: hoveredId === product.id
                          ? (product.badge_bg_color || '#3D2216')
                          : (product.badge_text_color || '#F9F6F0')
                      }}
                    >
                      <Sparkles className="w-3 h-3" style={{ color: 'inherit' }} />
                      {product.badge_text || styles.badge}
                    </span>
                    <div className="inline-flex items-center ml-1 text-[#3D2216] group-hover:text-[#F9F6F0] transition-colors duration-500">
                      <HalalIcon className="w-7 h-7 sm:w-8 sm:h-8" />
                    </div>
                    {isOutOfStock && (
                      <span className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full font-sans text-[10px] font-bold uppercase tracking-wider bg-[#C83E4D] text-[#F9F6F0] border border-[#C83E4D]/25">
                        Rupture de Stock
                      </span>
                    )}
                  </div>

                  <h3 className="font-sans text-2xl sm:text-3xl md:text-4xl font-black text-[#3D2216] group-hover:text-[#F9F6F0] transition-colors duration-500 uppercase tracking-tight leading-none mb-2 md:mb-4">
                    {product.name}
                  </h3>

                  <p className="font-sans text-sm md:text-base text-[#3D2216]/75 group-hover:text-[#F9F6F0]/85 transition-colors duration-500 leading-relaxed font-light mb-5 md:mb-8 max-w-lg">
                    {product.description}
                  </p>

                  <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
                    <Link
                      href={`/product/${product.slug}`}
                      className="px-8 py-3.5 border border-[#3D2216]/30 group-hover:border-[#F9F6F0]/50 hover:border-[#3D2216] group-hover:hover:border-[#F9F6F0] text-[#3D2216] group-hover:text-[#F9F6F0] font-sans text-xs font-bold tracking-widest uppercase rounded-full transition-all duration-500 hover:bg-[#3D2216]/5 group-hover:hover:bg-[#F9F6F0]/10 cursor-pointer text-center"
                    >
                      En Savoir Plus
                    </Link>

                    <button
                      onClick={() => {
                        const combinedProduct = {
                          ...product,
                          recipeTitle: styles.recipeTitle,
                          recipeIngredients: styles.recipeIngredients
                        };
                        openOrderModal(combinedProduct);
                      }}
                      disabled={isOutOfStock}
                      className="px-8 py-3.5 font-sans text-xs font-bold tracking-widest uppercase rounded-full shadow-md transition-all duration-500 hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{
                        backgroundColor: hoveredId === product.id
                          ? (product.button_text_color || '#F9F6F0')
                          : (product.button_bg_color || '#3D2216'),
                        color: hoveredId === product.id
                          ? (product.button_bg_color || '#3D2216')
                          : (product.button_text_color || '#F9F6F0')
                      }}
                    >
                      {isOutOfStock ? "Rupture de Stock" : "Commander"}
                      <ArrowRight className="w-4 h-4" style={{ color: 'inherit' }} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* RECIPE MODAL */}
      {activeRecipeProduct && (
        <div className="fixed inset-0 z-50 bg-[#150B07]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#F9F6F0] w-full max-w-2xl rounded-3xl p-8 md:p-10 border border-[#3D2216]/10 relative shadow-2xl overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setActiveRecipeProduct(null)}
              className="absolute top-6 right-6 p-1.5 rounded-full hover:bg-[#3D2216]/5 text-[#3D2216] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <span className="font-sans text-xs font-semibold tracking-widest text-[#C4A484] uppercase">
              Les Ingrédients Nobles
            </span>
            <h3 className="font-sans text-2xl md:text-3xl font-black text-[#3D2216] uppercase tracking-tight mt-1 mb-6">
              {activeRecipeProduct.recipeTitle}
            </h3>

            <div className="flex flex-col gap-6">
              {activeRecipeProduct.recipeIngredients.map((ingredient: Ingredient, idx: number) => (
                <div key={idx} className={`flex gap-4 items-start ${idx < 3 ? "pb-4 border-b border-[#3D2216]/5" : ""}`}>
                  <div className="p-3 bg-[#EADDC9]/30 rounded-xl text-[#C4A484] shrink-0">
                    {ingredient.icon}
                  </div>
                  <div>
                    <h4 className="font-sans font-bold text-sm text-[#3D2216] uppercase tracking-wide">{ingredient.name}</h4>
                    <p className="font-sans text-xs md:text-sm text-[#3D2216]/70 mt-1 font-light">{ingredient.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                const prod = activeRecipeProduct;
                setActiveRecipeProduct(null);
                openOrderModal(prod);
              }}
              className="w-full mt-8 py-3.5 bg-[#3D2216] hover:bg-[#150B07] text-[#F9F6F0] font-sans text-xs font-bold tracking-widest uppercase rounded-full transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              Commander maintenant
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* FORMAT SELECTOR & ORDER MODAL */}
      {activeOrderProduct && (
        <div className="fixed inset-0 z-50 bg-[#150B07]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#F9F6F0] w-full max-w-md rounded-3xl p-8 border border-[#3D2216]/10 relative shadow-2xl text-center">
            <button
              onClick={() => setActiveOrderProduct(null)}
              className="absolute top-6 right-6 p-1.5 rounded-full hover:bg-[#3D2216]/5 text-[#3D2216] cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <span className="font-sans text-xs font-semibold tracking-widest text-[#C4A484] uppercase">
              Sélection du Format
            </span>
            <h3 className="font-sans text-xl md:text-2xl font-black text-[#3D2216] uppercase tracking-tight mt-1 mb-2">
              {activeOrderProduct.name}
            </h3>
            <p className="font-sans text-xs text-[#3D2216]/60 leading-relaxed mb-6 font-light">
              Choisissez votre format de dégustation fait maison à Montréal.
            </p>

            {/* Allergens pills */}
            {activeOrderProduct.allergens && activeOrderProduct.allergens.length > 0 && (
              <div className="mb-6 text-left">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#3D2216]/40 block mb-1.5">
                  Allergènes configurés :
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {activeOrderProduct.allergens.map((alg: string) => (
                    <span key={alg} className="px-2.5 py-1 bg-red-500/5 border border-red-500/10 text-red-800/80 text-[9px] font-bold rounded-full uppercase tracking-wider">
                      {alg}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Formats Selection */}
            <div className="flex flex-col gap-3 mb-6">
              {[
                { name: "Le Solo", desc: "1 portion individuelle", mult: 1.0 },
                { name: "Le Duo", desc: "2 portions à partager", mult: 1.8 },
                { name: "Le Deluxe Box", desc: "4 portions gourmandes", mult: 3.2 }
              ].map((format) => {
                const isSelected = selectedFormat === format.name;
                const calculatedPrice = (activeOrderProduct.price_cents * format.mult / 100).toFixed(2);
                return (
                  <button
                    key={format.name}
                    type="button"
                    onClick={() => setSelectedFormat(format.name)}
                    className={`p-4 rounded-xl border text-left flex justify-between items-center transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#3D2216] text-[#F9F6F0] border-[#3D2216] shadow-sm"
                        : "bg-white text-[#3D2216] border-[#3D2216]/10 hover:border-[#3D2216]/30"
                    }`}
                  >
                    <div>
                      <span className="font-bold text-xs uppercase block">{format.name}</span>
                      <span className={`text-[10px] ${isSelected ? "text-[#FAF7F2]/80" : "text-[#3D2216]/60"}`}>
                        {format.desc}
                      </span>
                    </div>
                    <span className="font-bold text-sm">{calculatedPrice} $ CAD</span>
                  </button>
                );
              })}
            </div>

            {/* Quantity Selector */}
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#3D2216]/5">
              <span className="font-sans text-xs font-bold text-[#3D2216] uppercase tracking-wider">
                Quantité
              </span>
              <div className="flex items-center bg-white border border-[#3D2216]/10 rounded-full py-1 px-3">
                <button
                  type="button"
                  onClick={() => setOrderQuantity((q) => Math.max(1, q - 1))}
                  className="w-7 h-7 flex items-center justify-center text-[#3D2216]/60 hover:text-[#3D2216] font-bold cursor-pointer"
                  disabled={orderQuantity <= 1}
                >
                  -
                </button>
                <span className="w-8 text-center font-sans text-sm text-[#3D2216] font-bold">
                  {orderQuantity}
                </span>
                <button
                  type="button"
                  onClick={() => setOrderQuantity((q) => q + 1)}
                  className="w-7 h-7 flex items-center justify-center text-[#3D2216]/60 hover:text-[#3D2216] font-bold cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            {/* Add to Cart button */}
            <button
              type="button"
              onClick={() => {
                if (isAdding || isAdded) return;
                setIsAdding(true);
                setTimeout(() => {
                  addItem(activeOrderProduct, selectedFormat, orderQuantity);
                  setIsAdding(false);
                  setIsAdded(true);
                  setTimeout(() => {
                    setIsAdded(false);
                    setActiveOrderProduct(null);
                  }, 1000);
                }, 600);
              }}
              className={`w-full py-4 rounded-full font-sans text-xs font-semibold tracking-widest uppercase flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer ${
                isAdded ? "bg-green-700 text-white" : "bg-[#3D2216] hover:bg-[#150B07] text-[#F9F6F0]"
              }`}
              disabled={isAdding || isAdded}
            >
              {isAdding ? (
                <span className="w-5 h-5 border-2 border-[#F9F6F0]/30 border-t-[#F9F6F0] rounded-full animate-spin" />
              ) : isAdded ? (
                <>
                  Ajouté au panier !
                  <Check className="w-4 h-4" />
                </>
              ) : (
                <>
                  Ajouter au panier
                  <ShoppingBag className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
