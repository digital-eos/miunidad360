import { productJsonLd } from "@/lib/structured-data";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Problem } from "@/components/Problem";
import { Solution } from "@/components/Solution";
import { Demos } from "@/components/Demos";
import { HowItWorks } from "@/components/HowItWorks";
import { ForWho } from "@/components/ForWho";
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
        <Problem />
        <Solution />
        <Demos />
        <HowItWorks />
        <ForWho />
        <Faq />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
