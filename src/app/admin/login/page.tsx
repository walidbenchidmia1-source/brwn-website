"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Lock, Mail, AlertCircle, Loader } from "lucide-react";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      // Check if user profile is admin
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (profileError || !profile || profile.role !== "admin") {
        // Sign out if not admin to prevent session leak
        await supabase.auth.signOut();
        throw new Error("Accès refusé : Rôle administrateur requis");
      }

      // Session cookies are automatically set by browser client, trigger navigation
      router.push("/admin");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Identifiants invalides");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center px-4 font-sans select-none">
      <div className="w-full max-w-md bg-white border border-[#3D2216]/10 p-8 rounded-3xl shadow-xl flex flex-col items-center">
        {/* BRWN Logo */}
        <div className="relative w-[140px] h-[40px] mb-8">
          <Image
            src="/images/logo_brwn.png"
            alt="BRWN Logo"
            fill
            className="object-contain"
            priority
          />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-xl font-black text-[#3D2216] uppercase tracking-tight">
            Espace Administration
          </h1>
          <p className="text-xs text-[#3D2216]/60 mt-1 uppercase tracking-wider font-semibold">
            Connexion sécurisée
          </p>
        </div>

        {error && (
          <div className="w-full bg-[#C83E4D]/10 border border-[#C83E4D]/20 text-[#C83E4D] rounded-2xl p-4 mb-6 flex items-start gap-2.5 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="leading-relaxed font-semibold">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="w-full flex flex-col gap-4">
          {/* Email input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[#3D2216] uppercase tracking-wider pl-1">
              Adresse courriel
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3D2216]/40" />
              <input
                type="email"
                placeholder="admin@brwn.co"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#150B07]/5 border border-[#3D2216]/10 focus:border-[#C4A484] rounded-full py-3.5 pl-11 pr-6 text-sm text-[#3D2216] outline-hidden transition-colors"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Password input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[#3D2216] uppercase tracking-wider pl-1">
              Mot de passe
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3D2216]/40" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#150B07]/5 border border-[#3D2216]/10 focus:border-[#C4A484] rounded-full py-3.5 pl-11 pr-6 text-sm text-[#3D2216] outline-hidden transition-colors"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-4 bg-[#3D2216] hover:bg-[#150B07] disabled:bg-[#3D2216]/60 text-[#F9F6F0] font-sans text-xs font-bold tracking-widest uppercase rounded-full transition-all duration-300 hover:scale-102 active:scale-98 cursor-pointer flex items-center justify-center gap-2 mt-4"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Connexion en cours...
              </>
            ) : (
              "Se connecter"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
