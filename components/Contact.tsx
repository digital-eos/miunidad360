"use client";

import { useActionState } from "react";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { submitContactForm, type ContactActionResult } from "@/app/actions/contact";
import { trackFormSubmit } from "@/lib/analytics";

const initialState: ContactActionResult = { success: false };

const fieldClasses =
  "w-full rounded-lg border border-border-subtle bg-background px-4 py-3 text-sm text-foreground placeholder:text-foreground-muted/60 focus:border-accent focus:outline-none";

export function Contact() {
  const [state, formAction, isPending] = useActionState(submitContactForm, initialState);

  return (
    <section id="contacto" className="border-t border-border-subtle py-24">
      <Container>
        <div className="grid gap-12 sm:grid-cols-2">
          <Reveal>
            <SectionHeading
              eyebrow="Contacto"
              title="Contanos sobre tu proyecto"
              description="Dejanos tus datos y te respondemos para coordinar una demo, o escribinos directo por WhatsApp."
            />
            <div className="mt-8">
              <WhatsAppButton source="contact-section" />
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            {state.success ? (
              <div className="rounded-2xl border border-accent/40 bg-accent-soft p-6">
                <p className="font-display text-xl">¡Gracias por escribirnos!</p>
                <p className="mt-2 text-sm text-foreground-muted">
                  Recibimos tu mensaje y te vamos a responder a la brevedad.
                </p>
              </div>
            ) : (
              <form
                action={formAction}
                onSubmit={() => trackFormSubmit("contact-section")}
                className="space-y-4"
              >
                <input type="hidden" name="source" value="contacto-home" />
                <div
                  aria-hidden="true"
                  className="absolute h-0 w-0 overflow-hidden opacity-0"
                >
                  <label htmlFor="company_website">No completar este campo</label>
                  <input
                    type="text"
                    id="company_website"
                    name="company_website"
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>

                <div>
                  <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
                    Nombre
                  </label>
                  <input id="name" name="name" required className={fieldClasses} />
                </div>

                <div>
                  <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className={fieldClasses}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="phone" className="mb-1.5 block text-sm font-medium">
                      Teléfono
                    </label>
                    <input id="phone" name="phone" className={fieldClasses} />
                  </div>
                  <div>
                    <label htmlFor="company" className="mb-1.5 block text-sm font-medium">
                      Empresa
                    </label>
                    <input id="company" name="company" className={fieldClasses} />
                  </div>
                </div>

                <div>
                  <label htmlFor="message" className="mb-1.5 block text-sm font-medium">
                    Mensaje
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={4}
                    className={fieldClasses}
                  />
                </div>

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
                  {isPending ? "Enviando…" : "Enviar mensaje"}
                </button>
              </form>
            )}
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
