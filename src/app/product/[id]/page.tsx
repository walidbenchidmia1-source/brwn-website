"use client";

import { useState, use, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  ArrowLeft, 
  Heart, 
  Star, 
  ChevronDown, 
  ChevronUp, 
  Check, 
  ShoppingBag,
  X,
  Loader,
  Sparkles,
  CheckCircle2
} from "lucide-react";

interface Review {
  text: string;
  author: string;
}

interface Ingredient {
  name: string;
  image: string;
}

interface ProductData {
  id: string;
  name: string;
  tagline: string;
  description: string;
  image: string;
  color: string;
  textColor: string;
  rating: string;
  reviewsCount: string;
  reviews: Review[];
  ingredients: Ingredient[];
  allergyInfo: string;
}

const PRODUCTS_DATA: Record<string, ProductData> = {
  coffee: {
    id: "coffee",
    name: "L'Original Coffee Tiramisu",
    tagline: "Servi Frais",
    description: "Notre recette signature : trois couches superposées de biscuits cuillères imbibés d'un espresso de spécialité éthiopien, d'une crème mascarpone fouettée à la vanille Bourbon de Madagascar, le tout saupoudré d'un cacao noir intense.",
    image: "/images/tiramisu_coffee_box_cropped.png",
    color: "#3D2216", // Coffee Brown
    textColor: "#F9F6F0",
    rating: "4.9",
    reviewsCount: "1,248",
    reviews: [
      { text: "Le meilleur tiramisu que j'ai jamais mangé. L'équilibre avec l'espresso de spécialité est parfait !", author: "Alexandre M." },
      { text: "Incroyable onctuosité. On sent vraiment la qualité de la vanille Bourbon et la fraîcheur du mascarpone.", author: "Sophie R." },
      { text: "La boîte métallique est magnifique et le tiramisu est un délice absolu. Une expérience 5 étoiles.", author: "Yasmine L." }
    ],
    ingredients: [
      { name: "Espresso", image: "/images/ingredient_espresso_transparent.png" },
      { name: "Mascarpone", image: "/images/ingredient_mascarpone_transparent.png" }, // fallback to ladyfinger/coffee images for ingredients
      { name: "Vanille", image: "/images/ingredient_vanilla_custom_transparent.png" },
      { name: "Biscuit", image: "/images/ladyfinger.png" },
      { name: "Cacao", image: "/images/ingredient_cacao_custom_transparent.png" }
    ],
    allergyInfo: "Ce produit contient du gluten (biscuits cuillères), des produits laitiers (mascarpone, crème), et des œufs. Traces éventuelles de fruits à coque."
  },
  strawberry: {
    id: "strawberry",
    name: "Le Tiramisu Fraise",
    tagline: "Édition Limitée",
    description: "Une déclinaison fruitée alliant le crémeux du mascarpone à la fraîcheur d'un coulis de fraises fraîches de saison, sur un lit de biscuits cuillères délicatement imbibés d'un sirop vanillé et présentés dans un écrin métallique premium.",
    image: "/images/tiramisu_strawberry_cropped.png",
    color: "#C83E4D", // Strawberry Red
    textColor: "#F9F6F0",
    rating: "4.8",
    reviewsCount: "342",
    reviews: [
      { text: "Une fraîcheur incroyable ! Le coulis de fraise n'est pas trop sucré et se marie parfaitement au mascarpone.", author: "Camille D." },
      { text: "Le dessert d'été par excellence. Léger, fruité et tellement gourmand. Je recommande à 100%.", author: "Thomas B." },
      { text: "J'avais des doutes sur un tiramisu sans café, mais cette version fraise m'a totalement conquise.", author: "Marie P." }
    ],
    ingredients: [
      { name: "Gariguettes", image: "/images/ingredient_strawberry_transparent.png" },
      { name: "Mascarpone", image: "/images/ingredient_mascarpone_transparent.png" },
      { name: "Sirop Vanille", image: "/images/ingredient_vanilla_custom_transparent.png" },
      { name: "Biscuit", image: "/images/ladyfinger.png" }
    ],
    allergyInfo: "Ce produit contient du gluten, du lactose, et des œufs. Sans caféine. Traces de fruits à coque."
  },
  mango: {
    id: "mango",
    name: "Le Tiramisu Mangue",
    tagline: "Saveur de Saison",
    description: "Un voyage exotique mariant la douceur d'une compotée de mangues mûres à point avec notre crème mascarpone veloutée, pour un équilibre parfait entre fraîcheur et gourmandise sous un format boîte de conserve moderne.",
    image: "/images/tiramisu_mango_cropped.png",
    color: "#D97706", // Mango Orange/Gold
    textColor: "#F9F6F0",
    rating: "4.7",
    reviewsCount: "186",
    reviews: [
      { text: "Un voyage tropical ! La compotée de mangue avec la touche coco en arrière-plan est un délice.", author: "Lucas G." },
      { text: "Super original et très frais en bouche. Le format de la boîte en métal garde le dessert très frais.", author: "Emma V." },
      { text: "Parfait équilibre acide/sucré. Le mascarpone est léger comme un nuage. J'adore !", author: "Julien M." }
    ],
    ingredients: [
      { name: "Mangue", image: "/images/ingredient_mango_transparent.png" },
      { name: "Mascarpone", image: "/images/ingredient_mascarpone_transparent.png" },
      { name: "Sirop Coco", image: "/images/ingredient_coconut_transparent.png" },
      { name: "Citron Vert", image: "/images/ingredient_lime_transparent.png" }
    ],
    allergyInfo: "Ce produit contient du gluten, du lactose, et des œufs. Sans caféine. Traces de fruits à coque."
  }
};

import { createClient } from "@/utils/supabase/client";
import { useCart } from "@/context/CartContext";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ProductDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const productId = resolvedParams.id; // Slug

  const [product, setProduct] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAllergyOpen, setIsAllergyOpen] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [email, setEmail] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isOrderOpen, setIsOrderOpen] = useState(false);

  const { addItem } = useCart();
  const [selectedFormat, setSelectedFormat] = useState("Le Solo");
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  const openOrderModal = () => {
    setSelectedFormat("Le Solo");
    setOrderQuantity(1);
    setIsAdded(false);
    setIsAdding(false);
    setIsOrderOpen(true);
  };

  const supabase = createClient();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [productId]);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("slug", productId)
          .eq("is_active", true)
          .single();

        const staticDetails = PRODUCTS_DATA[productId] || PRODUCTS_DATA["coffee"];

        // Determine fallback theme color based on slug
        let color = "#5C3D2E"; // default brown
        const s = productId.toLowerCase();
        if (s.includes("coffee") || s.includes("cafe")) color = "#3D2216";
        else if (s.includes("strawberry") || s.includes("fraise")) color = "#C83E4D";
        else if (s.includes("mango") || s.includes("mangue")) color = "#D97706";

        if (error || !data) {
          if (process.env.NODE_ENV === "development") {
            const fallback = PRODUCTS_DATA[productId];
            if (fallback) {
              setProduct({
                ...fallback,
                price_cents: 1500,
                stock_quantity: 10,
                image_url: fallback.image,
                color: color
              });
            } else {
              setProduct(null);
            }
          } else {
            setProduct(null);
          }
        } else {
          // Fetch ingredients from Supabase joined relation
          const { data: ingData } = await supabase
            .from("product_ingredients")
            .select(`
              display_order,
              ingredients (
                id,
                name,
                image_url,
                is_active
              )
            `)
            .eq("product_id", data.id)
            .order("display_order", { ascending: true });

          const dbIngredients = (ingData || [])
            .filter((item: any) => item.ingredients && item.ingredients.is_active)
            .map((item: any) => ({
              name: item.ingredients.name,
              image: item.ingredients.image_url
            }));

          const finalIngredients = dbIngredients.length > 0 ? dbIngredients : staticDetails.ingredients;

          // Merge Supabase product with visual properties
          setProduct({
            ...data,
            tagline: staticDetails.tagline,
            rating: staticDetails.rating,
            reviewsCount: staticDetails.reviewsCount,
            reviews: staticDetails.reviews,
            ingredients: finalIngredients,
            allergyInfo: staticDetails.allergyInfo,
            color: color
          });
        }
      } catch (err) {
        console.error("Error loading product detail:", err);
        if (process.env.NODE_ENV === "development") {
          const fallback = PRODUCTS_DATA[productId];
          if (fallback) {
            setProduct({
              ...fallback,
              price_cents: 1500,
              stock_quantity: 10,
              image_url: fallback.image,
              color: "#3D2216"
            });
          } else {
            setProduct(null);
          }
        } else {
          setProduct(null);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [productId, supabase]);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setIsSubscribed(true);
      setTimeout(() => {
        setIsSubscribed(false);
        setIsOrderOpen(false);
        setEmail("");
      }, 2500);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center font-sans">
        <Loader className="w-8 h-8 animate-spin text-[#C4A484]" />
        <span className="text-xs uppercase tracking-widest font-bold text-[#3D2216]/60 mt-4">Chargement du produit...</span>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center font-sans">
        <h1 className="text-2xl font-bold text-[#3D2216]">Produit non trouvé</h1>
        <Link href="/" className="mt-4 text-[#C4A484] hover:underline flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Retour à l'accueil
        </Link>
      </div>
    );
  }

  const isOutOfStock = product.stock_quantity === 0;

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col font-sans overflow-x-hidden">
      
      {/* HEADER (Replicates Crumbl detail page header) */}
      <header className="fixed top-0 left-0 w-full bg-white z-50 border-b border-[#3D2216]/5 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-[#3D2216] hover:text-[#C4A484] transition-colors cursor-pointer">
          <ArrowLeft className="w-5 h-5" />
          <span className="font-sans text-xs md:text-sm font-bold tracking-widest uppercase">Menu</span>
        </Link>
        <Link href="/" className="relative w-[120px] h-[36px] cursor-pointer">
          <Image
            src="/images/logo_brwn.png"
            alt="BRWN Logo"
            fill
            className="object-contain"
            priority
          />
        </Link>
        <button
          onClick={openOrderModal}
          disabled={isOutOfStock}
          className="px-5 py-2 bg-[#3D2216] hover:bg-[#150B07] disabled:bg-[#3D2216]/50 text-[#F9F6F0] font-sans text-xs font-semibold tracking-widest uppercase rounded-full transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          {isOutOfStock ? "Rupture" : "Commander"}
          <ShoppingBag className="w-3.5 h-3.5" />
        </button>
      </header>

      {/* HERO SECTION (Replicates Crumbl cookie highlight card with colored wave bottom) */}
      <section 
        className="relative pt-32 pb-24 md:pt-40 md:pb-36 flex flex-col md:flex-row items-center justify-center px-6 md:px-16 overflow-visible select-none"
        style={{ 
          backgroundColor: (product.background_color && /^#[a-fA-F0-9]{6}$/.test(product.background_color)) 
            ? product.background_color 
            : (product.color || '#6B3F2A') 
        }}
      >
        <div className="max-w-6xl w-full flex flex-col md:flex-row items-center justify-between relative z-10">
          {/* Giant Product Image on the Left */}
          <div className="w-full md:w-1/2 flex justify-center items-center mb-10 md:mb-0 relative">
            <div className="relative w-[280px] h-[280px] sm:w-[380px] sm:h-[380px] md:w-[480px] md:h-[480px] lg:w-[540px] lg:h-[540px] transform hover:scale-105 hover:-rotate-3 transition-transform duration-500 filter drop-shadow-2xl">
              <Image
                src={product.image_url || "/images/tiramisu_coffee_box_cropped.png"}
                alt={product.name}
                fill
                sizes="(max-width: 768px) 380px, 540px"
                className="object-contain"
                priority
              />
            </div>
          </div>

          {/* Product Details on the Right */}
          <div className="w-full md:w-1/2 flex flex-col text-left md:pl-12 text-[#F9F6F0]">
            <div className="flex flex-wrap gap-2 items-center mb-3">
              <span className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full font-sans text-[10px] font-bold uppercase tracking-wider bg-[#FAF7F2]/15 text-[#FAF7F2] backdrop-blur-xs">
                <Sparkles className="w-3 h-3 text-inherit" />
                {product.badge_text || "GOURMAND"}
              </span>
              <div className="inline-flex items-center ml-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/halal_seal_white.png"
                  alt="Certification Halal"
                  className="w-10 h-10 sm:w-12 sm:h-12 object-contain"
                />
              </div>
              {isOutOfStock && (
                <span className="px-3.5 py-1.5 bg-[#C83E4D] text-[#F9F6F0] text-[10px] font-bold uppercase rounded-full border border-[#C83E4D]/25">
                  Rupture de Stock
                </span>
              )}
            </div>
            <h1 className="font-sans text-4xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tighter leading-none mb-6">
              {product.name}
            </h1>
            <p className="font-sans text-sm sm:text-base text-[#FAF7F2]/90 leading-relaxed font-light mb-8 max-w-lg">
              {product.description}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center mb-8">
              {/* Order Now (Solid White) */}
              <button
                onClick={openOrderModal}
                disabled={isOutOfStock}
                className="px-8 py-3.5 bg-white hover:bg-[#FAF7F2] text-[#3D2216] font-sans text-xs font-bold tracking-widest uppercase rounded-full shadow-md transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isOutOfStock ? "Rupture de Stock" : "Commander"}
                <ShoppingBag className="w-4 h-4" />
              </button>

              {/* Add To Favorites (Outline) */}
              <button
                onClick={() => setIsFavorited(!isFavorited)}
                className="px-8 py-3.5 border border-white/40 hover:border-white text-white font-sans text-xs font-bold tracking-widest uppercase rounded-full transition-all duration-300 hover:bg-white/10 cursor-pointer flex items-center justify-center gap-2"
              >
                <Heart className={`w-4 h-4 transition-colors ${isFavorited ? "fill-white text-white" : ""}`} />
                {isFavorited ? "Favori" : "Ajouter aux Favoris"}
              </button>
            </div>

            {/* Reviews Stars Indicator */}
            <div className="flex items-center gap-3">
              <div className="flex text-white">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <span className="font-sans text-xs md:text-sm font-semibold text-[#FAF7F2]/95 tracking-wide">
                {product.rating} note moyenne | {product.reviewsCount} avis
              </span>
            </div>
          </div>
        </div>

        {/* Wavy bottom divider separating Hero from Reviews */}
        <svg 
          viewBox="0 0 1440 100" 
          className="absolute bottom-0 left-0 w-full h-[50px] md:h-[80px] text-[#FAF7F2] fill-current z-0 pointer-events-none" 
          preserveAspectRatio="none"
        >
          <path d="M0,50 C320,100 480,0 960,100 C1200,50 1440,75 1440,75 L1440,100 L0,100 Z" />
        </svg>
      </section>

      {/* TOP REVIEWS SECTION (Replicates Crumbl review card grids with offset shadows) */}
      <section className="py-20 px-6 bg-[#FAF7F2] flex flex-col items-center">
        <div className="max-w-5xl w-full flex flex-col items-center text-center">
          <h2 className="font-sans text-3xl md:text-5xl font-black text-[#3D2216] uppercase tracking-tighter">
            Avis Clients
          </h2>
          <p className="font-sans text-xs md:text-sm text-[#3D2216]/60 mt-2 tracking-wide uppercase font-semibold">
            Basé sur les retours de nos premiers testeurs gourmets
          </p>

          {/* Testimonial Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 w-full text-left">
            {product.reviews.map((review: Review, idx: number) => (
              <div
                key={idx}
                className="bg-white border-2 border-[#3D2216] p-6 rounded-2xl shadow-[4px_4px_0px_0px_#3D2216] relative flex flex-col justify-between h-full min-h-[180px] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_#3D2216] transition-all duration-200"
              >
                {/* Decorative Pink double quote */}
                <span className="font-serif text-4xl text-[#C83E4D]/20 absolute top-4 left-4">“</span>
                <p className="font-sans text-sm text-[#3D2216]/90 leading-relaxed font-light mt-4 pl-2 mb-6">
                  {review.text}
                </p>
                <div className="font-sans text-xs font-bold text-[#C4A484] uppercase tracking-wider pl-2">
                  — {review.author}
                </div>
              </div>
            ))}
          </div>

          <p className="font-sans text-xs text-[#3D2216]/50 mt-10">
            Déjà goûté ? Partagez votre expérience sur les réseaux avec le hashtag <strong className="font-bold">#BRWNTiramisu</strong>
          </p>
        </div>
      </section>

      {/* INGREDIENTS SECTION (Replicates Crumbl circular ingredients display) */}
      <section className="py-20 px-6 bg-white flex flex-col items-center border-t border-b border-[#3D2216]/5">
        <div className="max-w-5xl w-full flex flex-col items-center text-center">
          <h2 className="font-sans text-2xl md:text-3xl font-black text-[#3D2216] uppercase tracking-tight">
            Fabriqué chaque jour avec des ingrédients frais
          </h2>
          <p className="font-sans text-sm text-[#3D2216]/60 max-w-xl mt-2 font-light">
            Une symphonie de matières premières sélectionnées avec rigueur et assemblées par nos maîtres artisans pour un dessert d'exception.
          </p>

          {/* Circular Ingredients Wrapper */}
          <div className="flex flex-wrap justify-center gap-8 md:gap-12 mt-10">
            {product.ingredients.map((ingredient: Ingredient, idx: number) => (
              <div key={idx} className="flex flex-col items-center gap-2">
                <div className="w-20 h-20 rounded-full border-2 border-[#3D2216]/10 overflow-hidden flex items-center justify-center bg-[#FAF7F2] relative shadow-xs hover:border-[#3D2216]/30 transition-colors duration-300">
                  <Image
                    src={ingredient.image}
                    alt={ingredient.name}
                    fill
                    sizes="80px"
                    className="object-contain p-2"
                  />
                </div>
                <span className="font-sans text-xs font-bold text-[#3D2216] uppercase tracking-wider">
                  {ingredient.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ALLERGY DROPDOWN (Replicates Crumbl expandable Allergy Information bar) */}
      <section className="py-12 px-6 bg-[#FAF7F2] flex flex-col items-center">
        <div className="max-w-3xl w-full">
          <button
            onClick={() => setIsAllergyOpen(!isAllergyOpen)}
            className="w-full bg-white border border-[#3D2216]/10 hover:border-[#3D2216]/20 px-6 py-4 rounded-xl flex items-center justify-between text-left transition-colors cursor-pointer shadow-xs"
          >
            <span className="font-sans text-sm font-bold text-[#3D2216] uppercase tracking-wider">
              Informations sur les allergènes
            </span>
            {isAllergyOpen ? <ChevronUp className="w-5 h-5 text-[#3D2216]" /> : <ChevronDown className="w-5 h-5 text-[#3D2216]" />}
          </button>

          {isAllergyOpen && (
            <div className="mt-2 bg-white border border-[#3D2216]/10 px-6 py-5 rounded-xl text-left transition-all duration-300">
              <p className="font-sans text-xs md:text-sm text-[#3D2216]/80 leading-relaxed font-light">
                {product.allergyInfo}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-white border-t border-[#3D2216]/5 py-8 text-center text-xs text-[#3D2216]/40">
        © {new Date().getFullYear()} BRWN. Tous droits réservés.
      </footer>

      {/* FORMAT SELECTOR & ORDER MODAL */}
      {isOrderOpen && (
        <div className="fixed inset-0 z-50 bg-[#150B07]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#F9F6F0] w-full max-w-md rounded-3xl p-8 border border-[#3D2216]/10 relative shadow-2xl text-center">
            <button
              onClick={() => setIsOrderOpen(false)}
              className="absolute top-6 right-6 p-1.5 rounded-full hover:bg-[#3D2216]/5 text-[#3D2216] cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <span className="font-sans text-xs font-semibold tracking-widest text-[#C4A484] uppercase">
              Sélection du Format
            </span>
            <h3 className="font-sans text-xl md:text-2xl font-black text-[#3D2216] uppercase tracking-tight mt-1 mb-2">
              {product.name}
            </h3>
            <p className="font-sans text-xs text-[#3D2216]/60 leading-relaxed mb-6 font-light">
              Choisissez votre format de dégustation fait maison à Montréal.
            </p>

            {/* Allergens pills */}
            {product.allergens && product.allergens.length > 0 && (
              <div className="mb-6 text-left">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#3D2216]/40 block mb-1.5">
                  Allergènes configurés :
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {product.allergens.map((alg: string) => (
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
                const calculatedPrice = (product.price_cents * format.mult / 100).toFixed(2);
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
                  addItem(product, selectedFormat, orderQuantity);
                  setIsAdding(false);
                  setIsAdded(true);
                  setTimeout(() => {
                    setIsAdded(false);
                    setIsOrderOpen(false);
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
    </div>
  );
}
