import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";

// Archivo is a grotesque typeface. Its 900 weight (Black) is blocky and matches the BRWN logo perfectly.
const archivo = Archivo({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "900"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.brwn.ca";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "BRWN | L'Original Coffee Tiramisu Premium",
  description: "Découvrez BRWN Original Coffee Tiramisu, une expérience gastronomique caféinée d'exception. Fait main avec des ingrédients haut de gamme, du mascarpone onctueux et du café de spécialité.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "BRWN | L'Original Coffee Tiramisu Premium",
    description: "Découvrez BRWN Original Coffee Tiramisu, une expérience gastronomique caféinée d'exception. Fait main à Montréal.",
    url: "/",
    siteName: "BRWN",
    locale: "fr_CA",
    type: "website",
    images: [
      {
        url: "/images/hero_background.png",
        width: 1200,
        height: 630,
        alt: "BRWN Original Coffee Tiramisu Premium",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BRWN | L'Original Coffee Tiramisu Premium",
    description: "Découvrez BRWN Original Coffee Tiramisu, une expérience gastronomique caféinée d'exception. Fait main à Montréal.",
    images: ["/images/hero_background.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/icon.svg?v=4", type: "image/svg+xml" },
      { url: "/icon.png?v=4", type: "image/png" },
    ],
    shortcut: "/icon.svg?v=4",
    apple: "/apple-icon.png?v=4",
  },
};

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
