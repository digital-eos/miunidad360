"use client";

import { useActionState } from "react";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { submitContactForm, type ContactActionResult } from "@/app/actions/contact";
import { trackFormSubmit } from "@/lib/analytics";

const initialState: ContactActionResult = { success: false };

const fieldClasses = "field";

export function Contact() {
  const [state, formAction, isPending] = useActionState(submitContactForm, initialState);

  return (
    <section id="contacto" className="border-t border-border-subtle bg-surface-muted py-20 sm:py-24">
      <Container>
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
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
              <div className="rounded-lg border border-secondary bg-secondary-soft p-6">
                <p className="text-lg font-semibold">¡Gracias por escribirnos!</p>
                <p className="mt-2 text-sm text-foreground-muted">
                  Recibimos tu mensaje y te vamos a responder a la brevedad.
                </p>
              </div>
            ) : (
              <form
                action={formAction}
                onSubmit={() => trackFormSubmit("contact-section")}
                className="space-y-4 rounded-lg border border-border-subtle bg-surface p-5 sm:p-7"
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
                  <label htmlFor="name" className="mb-1.5 block text-sm font-semibold">
                    Nombre
                  </label>
                  <input id="name" name="name" required className={fieldClasses} />
                </div>

                <div>
                  <label htmlFor="email" className="mb-1.5 block text-sm font-semibold">
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
                    <label htmlFor="phone" className="mb-1.5 block text-sm font-semibold">
                      Teléfono
                    </label>
                    <input id="phone" name="phone" className={fieldClasses} />
                  </div>
                  <div>
                    <label htmlFor="company" className="mb-1.5 block text-sm font-semibold">
                      Empresa
                    </label>
                    <input id="company" name="company" className={fieldClasses} />
                  </div>
                </div>

                <div>
                  <label htmlFor="message" className="mb-1.5 block text-sm font-semibold">
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
                  <p role="alert" className="text-sm text-danger">
                    {state.error}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={isPending}
                  className="btn btn-primary w-full"
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
