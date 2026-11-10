import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { DM_Serif_Display, Source_Sans_3 } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { organizationJsonLd } from "@/lib/structured-data";
import { FloatingWhatsApp } from "@/components/FloatingWhatsApp";
import "./globals.css";

// Interface typeface.
const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Editorial typeface, for headlines only.
const dmSerif = DM_Serif_Display({
  variable: "--font-dm-serif",
  subsets: ["latin"],
  weight: "400",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://miunidad360.com.ar";

const HERO_DESCRIPTION =
  "Edificios, departamentos, casas o lotes: convertimos tus planos, renders o modelo BIM en una publicación 3D con su propio link. Tus compradores tocan cada unidad y ven su superficie, precio y disponibilidad desde el navegador.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "MiUnidad360 · Transformá tu propiedad en una experiencia 3D interactiva",
    template: "%s · MiUnidad360",
  },
  description: HERO_DESCRIPTION,
  keywords: [
    "visualización 3D interactiva",
    "publicaciones 3D inmobiliarias",
    "propiedades en 3D",
    "edificios en 3D",
    "departamentos en 3D",
    "maqueta 3D",
    "venta en pozo",
    "real estate 3D",
    "selector de unidades",
    "loteo 3D",
    "masterplan interactivo",
    "desarrollos inmobiliarios Argentina",
    "Digital EOS",
  ],
  authors: [{ name: "Digital EOS" }],
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: siteUrl,
    siteName: "MiUnidad360",
    title: "MiUnidad360 · Transformá tu propiedad en una experiencia 3D interactiva",
    description: HERO_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "MiUnidad360 · Transformá tu propiedad en una experiencia 3D interactiva",
    description: HERO_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f7f6f2",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-AR"
      className={`${sourceSans.variable} ${dmSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
        />
        {children}
        <Suspense fallback={null}>
          <FloatingWhatsApp />
        </Suspense>
        <Analytics />
      </body>
    </html>
  );
}
