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

        <dl className="mt-6 grid grid-cols-2 overflow-hidden rounded-lg border border-border-subtle bg-surface sm:grid-cols-4">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className={
                "border-border-subtle px-4 py-3 " +
                (i % 2 === 1 ? "border-l " : "") +
                (i >= 2 ? "border-t sm:border-t-0 " : "") +
                (i === 2 ? "sm:border-l" : "")
              }
            >
              <dt className="label-caps text-foreground-muted">{stat.label}</dt>
              <dd className="mt-0.5 text-xl font-semibold tabular-nums">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </Container>
    </header>
  );
}
