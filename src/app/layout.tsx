import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";

// Archivo is a grotesque typeface. Its 900 weight (Black) is blocky and matches the BRWN logo perfectly.
const archivo = Archivo({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "900"],
});

export const metadata: Metadata = {
  title: "BRWN | L'Original Coffee Tiramisu Premium",
  description: "Découvrez BRWN Original Coffee Tiramisu, une expérience gastronomique caféinée d'exception. Fait main avec des ingrédients haut de gamme, du mascarpone onctueux et du café de spécialité.",
  openGraph: {
    title: "BRWN | L'Original Coffee Tiramisu Premium",
    description: "Découvrez BRWN Original Coffee Tiramisu, une expérience gastronomique caféinée d'exception.",
    type: "website",
  },
};

import { CartProvider } from "@/context/CartContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${archivo.variable} h-full antialiased`}
    >
      <head>
        {/* 
          Si vous possédez un projet Adobe Fonts (Typekit) pour Roc Grotesk, 
          vous pouvez insérer la balise de liaison stylesheet ici :
          <link rel="stylesheet" href="https://use.typekit.net/VOTRE_ID_PROJET.css" />
        */}
      </head>
      <body className="font-sans min-h-full flex flex-col bg-[#F9F6F0] text-[#150B07] overflow-x-hidden">
        <CartProvider>
          {children}
        </CartProvider>
      </body>
    </html>
  );
}

