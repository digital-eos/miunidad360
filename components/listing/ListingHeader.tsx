import Link from "next/link";
import { Container } from "@/components/ui/Container";

/**
 * Top of a demo shown as a property listing: name, location and "desde" price. The 3D view
 * with its info card sits right below it.
 */
export function ListingHeader({
  eyebrow,
  title,
  location,
  priceLabel,
  description,
}: {
  eyebrow: string;
  title: string;
  location: string;
  /** "USD 141.500", or null when there are no public prices. */
  priceLabel: string | null;
  description?: string;
}) {
  return (
    <header className="pt-6 pb-6 sm:pt-8">
      <Container className="max-w-[1400px]">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-foreground-muted transition-colors duration-150 hover:text-primary"
        >
          ← Volver al inicio
        </Link>

        <div className="mt-5 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div className="min-w-0">
            <p className="eyebrow">
              {eyebrow}
            </p>
            <h1 className="mt-2 font-display text-4xl leading-tight sm:text-5xl">{title}</h1>
            <p className="mt-2 text-sm text-foreground-muted sm:text-base">{location}</p>
          </div>
          <div className="text-left sm:text-right">
            {priceLabel ? (
              <>
                <p className="label-caps text-foreground-muted">Desde</p>
                <p className="mt-1 text-3xl font-semibold tabular-nums sm:text-4xl">{priceLabel}</p>
              </>
            ) : (
              <p className="text-xl font-semibold text-foreground-muted">Precio a consultar</p>
            )}
          </div>
        </div>

        {description ? (
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-foreground-muted">
            {description}
          </p>
        ) : null}
      </Container>
    </header>
  );
}
