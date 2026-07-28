import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { 
  Package, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  ArrowRight,
  TrendingDown
} from "lucide-react";

export const revalidate = 0; // Disable caching to fetch live data on load

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // Fetch all products
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("name", { ascending: true });

  const products = data || [];

  if (error) {
    return (
      <div className="bg-red-700/10 border border-red-700/20 text-red-800 rounded-3xl p-6">
        <h2 className="font-bold mb-2">Erreur de connexion base de données</h2>
        <p className="text-sm font-light">{error.message}</p>
      </div>
    );
  }

  // Calculate metrics
  const totalProducts = products.length;
  const activeProducts = products.filter(p => p.is_active).length;
  const totalStock = products.reduce((acc, p) => acc + p.stock_quantity, 0);
  const outOfStock = products.filter(p => p.stock_quantity === 0).length;
  
  // Low stock products (stock > 0 and stock <= low_stock_threshold)
  const lowStockProducts = products.filter(
    p => p.is_active && p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_threshold
  );

  return (
    <div className="flex flex-col gap-8">
      {/* Page Title */}
      <div className="flex flex-col">
        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">
          Tableau de bord
        </h1>
        <p className="text-xs text-[#3D2216]/60 mt-1 uppercase tracking-wider font-semibold">
          Vue d'ensemble de l'activité de BRWN
        </p>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total active products */}
        <div className="bg-white border-2 border-[#3D2216] p-6 rounded-2xl shadow-[4px_4px_0px_0px_#3D2216] flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-[#3D2216]/50 uppercase tracking-wider">
              Menu Actif
            </span>
            <span className="text-3xl font-black mt-2">
              {activeProducts}/{totalProducts}
            </span>
            <span className="text-[10px] font-semibold text-[#3D2216]/60 mt-1 uppercase">
              Saveurs affichées
            </span>
          </div>
          <div className="p-3 bg-[#FAF7F2] rounded-full border border-[#3D2216]/10 text-[#3D2216]">
            <Package className="w-6 h-6" />
          </div>
        </div>

        {/* Total Stock */}
        <div className="bg-white border-2 border-[#3D2216] p-6 rounded-2xl shadow-[4px_4px_0px_0px_#3D2216] flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-[#3D2216]/50 uppercase tracking-wider">
              Portions Totales
            </span>
            <span className="text-3xl font-black mt-2">
              {totalStock}
            </span>
            <span className="text-[10px] font-semibold text-[#3D2216]/60 mt-1 uppercase">
              En stock
            </span>
          </div>
          <div className="p-3 bg-[#FAF7F2] rounded-full border border-[#3D2216]/10 text-[#C4A484]">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white border-2 border-[#3D2216] p-6 rounded-2xl shadow-[4px_4px_0px_0px_#3D2216] flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-[#3D2216]/50 uppercase tracking-wider">
              Stocks Faibles
            </span>
            <span className="text-3xl font-black mt-2 text-[#D97706]">
              {lowStockProducts.length}
            </span>
            <span className="text-[10px] font-semibold text-[#D97706]/85 mt-1 uppercase">
              Sous le seuil
            </span>
          </div>
          <div className="p-3 bg-[#D97706]/10 rounded-full border border-[#D97706]/35 text-[#D97706]">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        {/* Ruptures */}
        <div className="bg-white border-2 border-[#3D2216] p-6 rounded-2xl shadow-[4px_4px_0px_0px_#3D2216] flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-[#3D2216]/50 uppercase tracking-wider">
              Ruptures de Stock
            </span>
            <span className="text-3xl font-black mt-2 text-[#C83E4D]">
              {outOfStock}
            </span>
            <span className="text-[10px] font-semibold text-[#C83E4D]/85 mt-1 uppercase">
              Épuisés
            </span>
          </div>
          <div className="p-3 bg-[#C83E4D]/10 rounded-full border border-[#C83E4D]/35 text-[#C83E4D]">
            <XCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Two columns for Alerts and Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Low Stock alerts column (2/3 width) */}
        <div className="lg:col-span-2 bg-white border-2 border-[#3D2216] rounded-2xl p-6 shadow-[4px_4px_0px_0px_#3D2216] flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-[#3D2216]/10 pb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#D97706]" />
              <h2 className="text-lg font-black uppercase tracking-tight">Alertes de Stock</h2>
            </div>
            <span className="px-2.5 py-0.5 bg-[#D97706]/10 text-[#D97706] text-[10px] font-bold uppercase rounded-full border border-[#D97706]/20">
              {lowStockProducts.length} alertes
            </span>
          </div>

          {lowStockProducts.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#3D2216]/50 flex flex-col items-center gap-2">
              <CheckCircle2 className="w-8 h-8 text-green-700/60" />
              <span>Aucune alerte de stock. Tous les produits actifs sont bien approvisionnés !</span>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {lowStockProducts.map((product) => (
                <div 
                  key={product.id}
                  className="flex items-center justify-between p-4 bg-[#FAF7F2] border border-[#3D2216]/10 rounded-xl hover:border-[#3D2216]/30 transition-colors"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-black uppercase">{product.name}</span>
                    <span className="text-[10px] font-semibold text-[#3D2216]/50 uppercase mt-0.5">
                      Seuil d'alerte : {product.low_stock_threshold} portions
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="px-3 py-1 bg-[#D97706]/10 text-[#D97706] text-xs font-bold rounded-full border border-[#D97706]/20">
                      {product.stock_quantity} portions restantes
                    </span>
                    <Link
                      href="/admin/products"
                      className="p-1.5 hover:bg-[#3D2216]/5 rounded-full text-[#3D2216] transition-colors"
                      title="Réapprovisionner"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick links & tips (1/3 width) */}
        <div className="bg-white border-2 border-[#3D2216] rounded-2xl p-6 shadow-[4px_4px_0px_0px_#3D2216] flex flex-col gap-6">
          <div className="border-b border-[#3D2216]/10 pb-4">
            <h2 className="text-lg font-black uppercase tracking-tight">Raccourcis</h2>
          </div>

          <div className="flex flex-col gap-3">
            <Link
              href="/admin/products"
              className="flex items-center justify-between p-4 bg-[#FAF7F2] border border-[#3D2216]/10 hover:border-[#3D2216] rounded-xl font-bold text-xs uppercase tracking-wider text-[#3D2216] transition-all"
            >
              <span>Gérer les tiramisus</span>
              <Package className="w-4 h-4" />
            </Link>
            <Link
              href="/"
              target="_blank"
              className="flex items-center justify-between p-4 bg-[#FAF7F2] border border-[#3D2216]/10 hover:border-[#3D2216] rounded-xl font-bold text-xs uppercase tracking-wider text-[#3D2216] transition-all"
            >
              <span>Voir le site public</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
