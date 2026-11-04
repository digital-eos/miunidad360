import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope, IBM_Plex_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz", "SOFT", "WONK"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://miunidad360.com.ar";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "MiUnidad360 — Vendé tus unidades antes de construirlas",
    template: "%s · MiUnidad360",
  },
  description:
    "MiUnidad360 crea experiencias 3D interactivas para que tus compradores exploren el edificio, elijan su unidad y vean disponibilidad, precio y sol en tiempo real. Un producto de Digital EOS.",
  keywords: [
    "maqueta 3D",
    "venta en pozo",
    "real estate 3D",
    "selector de unidades",
    "desarrollos inmobiliarios Argentina",
    "Digital EOS",
  ],
  authors: [{ name: "Digital EOS" }],
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: siteUrl,
    siteName: "MiUnidad360",
    title: "MiUnidad360 — Vendé tus unidades antes de construirlas",
    description:
      "Experiencias 3D interactivas para promotores, inmobiliarias y estudios de arquitectura en Argentina.",
  },
  twitter: {
    card: "summary_large_image",
    title: "MiUnidad360 — Vendé tus unidades antes de construirlas",
    description:
      "Experiencias 3D interactivas para promotores, inmobiliarias y estudios de arquitectura en Argentina.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0a0b",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-AR"
      className={`${fraunces.variable} ${manrope.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
