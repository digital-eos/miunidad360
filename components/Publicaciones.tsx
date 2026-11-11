import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { PUBLICACIONES } from "@/lib/publicaciones";

const cardClasses =
  "group flex h-full flex-col overflow-hidden rounded-lg border border-border-subtle bg-surface transition-colors duration-150 hover:border-primary focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

/** The live listings for buyers: the whole content of the /publicaciones page. */
export function Publicaciones() {
  return (
    <section className="pt-12 pb-20 sm:pt-16 sm:pb-24">
      <Container>
        <h1 className="font-display text-4xl leading-tight text-balance sm:text-5xl">
          Propiedades publicadas
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-foreground-muted">
          Proyectos en venta que podés recorrer en 3D: elegí una unidad y mirá su precio, su plano
          y su disponibilidad.
        </p>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {PUBLICACIONES.map((p) => (
            <Link key={p.slug} href={p.href} className={cardClasses}>
              <div className="relative aspect-[16/10] overflow-hidden border-b border-border-subtle bg-surface-muted">
                <Image
                  src={p.imagen.src}
                  alt={p.imagen.alt}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1280px) 45vw, 400px"
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                />
              </div>
              <div className="flex flex-1 flex-col p-4 sm:p-5">
                <p className="label-caps text-primary">{p.operacion}</p>
                <p className="mt-1.5 font-display text-2xl leading-tight">{p.titulo}</p>
                <p className="mt-0.5 text-sm text-foreground-muted">{p.ubicacion}</p>
                <p className="mt-3 text-sm leading-relaxed text-foreground-muted">{p.resumen}</p>
                <p className="mt-auto pt-4 text-sm font-semibold text-primary group-hover:underline group-hover:underline-offset-4">
                  Ver en 3D <span aria-hidden="true">→</span>
                </p>
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
