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
              Los datos que nos dejás a través de los formularios del sitio (de contacto, o de
              consulta por una unidad puntual dentro del selector de unidades) —nombre, email,
              teléfono, empresa, mensaje y, si corresponde, la unidad que te interesó— se usan
              únicamente para responder tu consulta y coordinar una demo de MiUnidad360.
            </p>
            <p>
              Si nos escribís por WhatsApp desde alguno de los botones del sitio, esa
              conversación queda en WhatsApp y la usamos con el mismo fin: responderte y
              coordinar una demo.
            </p>
            <p>
              Conservamos estos datos mientras dure la conversación comercial con vos y los
              eliminamos a pedido. No compartimos tus datos con terceros ni los usamos para
              fines distintos a los descriptos acá. Si en algún momento querés que eliminemos
              tu información de nuestros registros, escribinos y lo resolvemos.
            </p>
            <p>
              El modo de captura de video de las demos (parámetro <code>?capture=1</code>) no
              recolecta ni envía ningún dato personal: el video se genera y se descarga
              directamente en tu navegador.
            </p>
            <p>
              Para cualquier consulta sobre tus datos podés escribirnos por WhatsApp o por el
              formulario de contacto.
            </p>
            <p>MiUnidad360 es un producto de Digital EOS.</p>
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
