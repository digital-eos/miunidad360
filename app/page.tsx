import { productJsonLd } from "@/lib/structured-data";
import { Header } from "@/components/Header";
import { Hero } from "@/components/home/Hero";
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
        <Faq />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
