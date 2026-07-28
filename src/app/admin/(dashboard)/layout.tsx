import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { LogOut, LayoutDashboard, Package, ShieldCheck, ShoppingBag, Settings } from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // Securely authenticate user via getUser()
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/admin/login");
  }

  // Fetch admin profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col font-sans text-[#3D2216]">
      {/* Admin Navbar */}
      <header className="fixed top-0 left-0 w-full bg-white z-40 border-b border-[#3D2216]/10 px-6 py-4 flex items-center justify-between shadow-xs select-none">
        <div className="flex items-center gap-8">
          <Link href="/" className="relative w-[120px] h-[36px] cursor-pointer">
            <Image
              src="/images/logo_brwn.png"
              alt="BRWN Logo"
              fill
              className="object-contain"
              priority
            />
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/admin"
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#3D2216]/70 hover:text-[#3D2216] transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" />
              Aperçu
            </Link>
            <Link
              href="/admin/products"
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#3D2216]/70 hover:text-[#3D2216] transition-colors"
            >
              <Package className="w-4 h-4" />
              Produits & Stocks
            </Link>
            <Link
              href="/admin/orders"
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#3D2216]/70 hover:text-[#3D2216] transition-colors"
            >
              <ShoppingBag className="w-4 h-4" />
              Commandes
            </Link>
            <Link
              href="/admin/settings"
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#3D2216]/70 hover:text-[#3D2216] transition-colors"
            >
              <Settings className="w-4 h-4" />
              Réglages
            </Link>
          </nav>
        </div>

        {/* Admin actions / Account Info */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-black uppercase tracking-wide">
              {profile.full_name || "Administrateur"}
            </span>
            <span className="text-[10px] font-bold text-[#C4A484] uppercase tracking-widest flex items-center gap-1 justify-end">
              <ShieldCheck className="w-3 h-3 text-[#D97706]" />
              Super Admin
            </span>
          </div>

          <form action="/api/admin/logout" method="POST">
            <button
              type="submit"
              className="p-2.5 hover:bg-[#C83E4D]/10 text-[#C83E4D] hover:text-[#C83E4D] rounded-full transition-colors cursor-pointer"
              title="Se déconnecter"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </header>

      {/* Main Admin Area */}
      <main className="flex-1 pt-24 px-6 md:px-12 pb-16 max-w-7xl mx-auto w-full">
        {/* Mobile Navigation */}
        <div className="md:hidden flex flex-wrap gap-2 mb-6 border-b border-[#3D2216]/10 pb-4">
          <Link
            href="/admin"
            className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#3D2216]/70 hover:text-[#3D2216] py-1.5 px-3 bg-white border border-[#3D2216]/10 rounded-full"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Aperçu
          </Link>
          <Link
            href="/admin/products"
            className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#3D2216]/70 hover:text-[#3D2216] py-1.5 px-3 bg-white border border-[#3D2216]/10 rounded-full"
          >
            <Package className="w-3.5 h-3.5" />
            Produits
          </Link>
          <Link
            href="/admin/orders"
            className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#3D2216]/70 hover:text-[#3D2216] py-1.5 px-3 bg-white border border-[#3D2216]/10 rounded-full"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            Commandes
          </Link>
          <Link
            href="/admin/settings"
            className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#3D2216]/70 hover:text-[#3D2216] py-1.5 px-3 bg-white border border-[#3D2216]/10 rounded-full"
          >
            <Settings className="w-3.5 h-3.5" />
            Réglages
          </Link>
        </div>

        {children}
      </main>
    </div>
  );
}
