"use client";

import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { StartingMaterial } from "@/components/home/StartingMaterial";
import { trackDemoClick } from "@/lib/analytics";

export function Hero() {
  return (
    <section className="relative bg-background pt-14 pb-16 sm:pt-20 sm:pb-24">
      <Container className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
        <div>
          <p className="eyebrow">MiUnidad360 · Desarrolladoras, loteos y estudios</p>
          <h1 className="mt-5 font-display text-4xl leading-[1.1] text-balance sm:text-5xl">
            Vendé tus unidades en pozo con un recorrido 3D interactivo
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-foreground-muted sm:text-lg">
            Tus compradores exploran el proyecto, ven precio y disponibilidad de cada unidad y
            te consultan por WhatsApp.
          </p>
          <div className="mt-8">
            <Link
              href="/demos/torre-aldrey"
              onClick={() => trackDemoClick("selector", "hero")}
              className="btn btn-primary group min-h-12 w-full px-7 text-base sm:w-auto"
            >
              Ver una demo
              <span
                aria-hidden="true"
                className="transition-transform duration-200 group-hover:translate-x-1"
              >
                →
              </span>
            </Link>
          </div>
        </div>

        <StartingMaterial />
      </Container>
    </section>
  );
}
