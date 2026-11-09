import Link from "next/link";
import { Container } from "@/components/ui/Container";

export type ListingStat = { label: string; value: string };

/**
 * Top of a demo shown as a property listing: name, location, "desde" price and the key
 * numbers. The 3D view with its info card sits right below it.
 */
export function ListingHeader({
  eyebrow,
  title,
  location,
  priceLabel,
  description,
  stats,
}: {
  eyebrow: string;
  title: string;
  location: string;
  /** "USD 141.500", or null when there are no public prices. */
  priceLabel: string | null;
  description?: string;
  stats: ListingStat[];
}) {
  return (
    <header className="pt-6 pb-6 sm:pt-8">
      <Container className="max-w-[1400px]">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-foreground-muted transition-colors duration-200 hover:text-accent-strong sm:text-sm"
        >
          ← Volver al inicio
        </Link>

        <div className="mt-5 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div className="min-w-0">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent-strong">
              {eyebrow}
            </p>
            <h1 className="mt-2 font-display text-4xl sm:text-5xl">{title}</h1>
            <p className="mt-2 text-sm text-foreground-muted sm:text-base">{location}</p>
          </div>
          <div className="text-left sm:text-right">
            {priceLabel ? (
              <>
                <p className="text-xs text-foreground-muted">Desde</p>
                <p className="font-display text-3xl sm:text-4xl">{priceLabel}</p>
              </>
            ) : (
              <p className="font-display text-2xl text-foreground-muted">Precio a consultar</p>
            )}
          </div>
        </div>

        {description ? (
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-foreground-muted">
            {description}
          </p>
        ) : null}

        <dl className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-border-subtle bg-background-elevated px-4 py-3"
            >
              <dt className="text-xs text-foreground-muted">{stat.label}</dt>
              <dd className="mt-0.5 font-display text-xl">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </Container>
    </header>
  );
}
