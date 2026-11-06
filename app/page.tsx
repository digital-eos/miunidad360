import { productJsonLd } from "@/lib/structured-data";
import { Header } from "@/components/Header";
import { Hero } from "@/components/home/Hero";
import { FidelitySection } from "@/components/home/FidelitySection";
import { ResultSection } from "@/components/home/ResultSection";
import { UnitTypes } from "@/components/home/UnitTypes";
import { Demos } from "@/components/Demos";
import { HowYouReceiveIt } from "@/components/HowYouReceiveIt";
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
        <FidelitySection />
        <ResultSection />
        <UnitTypes />
        <Demos />
        <HowYouReceiveIt />
        <Faq />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
