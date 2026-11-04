import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Privacidad",
  description:
    "Cómo tratamos los datos que nos dejás a través del formulario de contacto.",
};

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="flex-1 pt-32 pb-24">
        <Container className="max-w-2xl">
          <h1 className="font-display text-3xl">Privacidad</h1>
          <div className="mt-6 space-y-4 text-sm leading-relaxed text-foreground-muted">
            <p>
              Los datos que nos dejás a través del formulario de contacto (nombre, email,
              teléfono, empresa y mensaje) se usan únicamente para responder tu consulta y
              coordinar una demo de MiUnidad360.
            </p>
            <p>
              No compartimos tus datos con terceros ni los usamos para fines distintos a
              los descriptos acá. Si en algún momento querés que eliminemos tu información
              de nuestros registros, escribinos y lo resolvemos.
            </p>
            <p>MiUnidad360 es un producto de Digital EOS.</p>
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
