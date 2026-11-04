import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { WhatsAppButton } from "@/components/WhatsAppButton";

export function ComingSoon({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <main className="flex min-h-screen flex-1 items-center bg-grid">
      <Container className="py-24 text-center">
        <p className="mb-4 font-mono text-xs uppercase tracking-[0.25em] text-accent-strong">
          {eyebrow}
        </p>
        <h1 className="font-display text-4xl sm:text-5xl">{title}</h1>
        <p className="mx-auto mt-5 max-w-xl text-foreground-muted">{description}</p>
        <p className="mx-auto mt-2 max-w-xl font-display text-2xl italic text-accent-strong">
          Próximamente
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-border-subtle px-6 py-3 text-sm font-medium transition-colors duration-200 hover:border-accent hover:text-accent-strong"
          >
            Volver al inicio
          </Link>
          <WhatsAppButton source="demo-coming-soon" />
        </div>
      </Container>
    </main>
  );
}
