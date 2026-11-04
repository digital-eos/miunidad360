"use client";

import { useActionState } from "react";
import { Container } from "@/components/ui/Container";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { submitContactForm, type ContactActionResult } from "@/app/actions/contact";
import { trackFormSubmit } from "@/lib/analytics";

const initialState: ContactActionResult = { success: false };

const DEMO_LABELS: Record<string, string> = {
  maqueta: "la maqueta 3D",
  selector: "el selector de unidades",
  sol: "el estudio de asoleamiento",
};

const fieldClasses =
  "w-full rounded-lg border border-border-subtle bg-background px-4 py-3 text-sm text-foreground placeholder:text-foreground-muted/60 focus:border-accent focus:outline-none";

export function DemoCTA({ demo }: { demo: "maqueta" | "selector" | "sol" }) {
  const [state, formAction, isPending] = useActionState(submitContactForm, initialState);
  const source = `demo-${demo}-end`;
  const demoLabel = DEMO_LABELS[demo];

  return (
    <section id="demo-cta" className="border-t border-border-subtle bg-background py-20">
      <Container className="max-w-2xl text-center">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent">
          ¿Te gustó {demoLabel}?
        </p>
        <h2 className="mt-3 font-display text-3xl sm:text-4xl">
          ¿Querés esto para tu proyecto?
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-foreground-muted">
          Dejanos tus datos y te contactamos para mostrarte cómo se vería con tu propio
          desarrollo, o escribinos directo por WhatsApp.
        </p>

        <div className="mt-8 flex justify-center">
          <WhatsAppButton
            source={source}
            message={`¡Hola! Estaba probando ${demoLabel} de MiUnidad360 y quiero saber más para mi proyecto.`}
          />
        </div>

        <div className="mx-auto mt-8 max-w-sm text-left">
          {state.success ? (
            <div className="rounded-2xl border border-accent/40 bg-accent-soft p-6 text-center">
              <p className="font-display text-xl">¡Gracias por escribirnos!</p>
              <p className="mt-2 text-sm text-foreground-muted">
                Recibimos tu mensaje y te vamos a responder a la brevedad.
              </p>
            </div>
          ) : (
            <form
              action={formAction}
              onSubmit={() => trackFormSubmit(source)}
              className="space-y-3"
            >
              <input type="hidden" name="source" value={source} />
              <input
                type="hidden"
                name="message"
                value={`Quiero una demo de MiUnidad360 para mi proyecto (vi ${demoLabel}).`}
              />
              <div aria-hidden="true" className="absolute h-0 w-0 overflow-hidden opacity-0">
                <label htmlFor={`${demo}-company_website`}>No completar este campo</label>
                <input
                  type="text"
                  id={`${demo}-company_website`}
                  name="company_website"
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>

              <input
                name="name"
                placeholder="Nombre"
                required
                aria-label="Nombre"
                className={fieldClasses}
              />
              <input
                name="email"
                type="email"
                placeholder="Email"
                required
                aria-label="Email"
                className={fieldClasses}
              />

              {state.error ? (
                <p role="alert" className="text-sm text-red-400">
                  {state.error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={isPending}
                className="w-full rounded-full bg-accent px-6 py-3 text-sm font-medium text-background transition-colors duration-200 hover:bg-[#ffb84f] disabled:opacity-60"
              >
                {isPending ? "Enviando…" : "Quiero que me contacten"}
              </button>
            </form>
          )}
        </div>
      </Container>
    </section>
  );
}
