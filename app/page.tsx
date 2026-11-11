import { productJsonLd } from "@/lib/structured-data";
import { Header } from "@/components/Header";
import { Hero } from "@/components/home/Hero";
import { ProjectTypes } from "@/components/home/ProjectTypes";
import { Privacy } from "@/components/home/Privacy";
import { HowItWorksSection } from "@/components/home/HowItWorksSection";
import { ResultSection } from "@/components/home/ResultSection";
import { Faq } from "@/components/Faq";
import { Contact } from "@/components/Contact";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd()) }}
      />
      <Header />
      <main className="flex flex-1 flex-col">
        <Hero />
        <HowItWorksSection />
        <ResultSection />
        <ProjectTypes />
        <Privacy />
        <Faq />
        <Contact />
      </main>
      <Footer credits="Créditos de la portada: render del folleto de venta del edificio. Planos generados por MiUnidad360 desde el modelo IFC del dataset Schependomlaan (ROOT bv, Hendriks Bouw en Ontwikkeling, TU Eindhoven), CC BY 4.0." />
    </>
  );
}
