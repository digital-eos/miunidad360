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
    <main className="flex min-h-screen flex-1 items-center bg-background">
      <Container className="py-24 text-center">
        <p className="eyebrow mb-4">
          {eyebrow}
        </p>
        <h1 className="font-display text-4xl sm:text-5xl">{title}</h1>
        <p className="mx-auto mt-5 max-w-xl text-foreground-muted">{description}</p>
        <p className="mx-auto mt-4 w-fit rounded-md bg-surface-muted px-3 py-1 label-caps text-foreground-muted">
          Próximamente
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/"
            className="btn btn-secondary"
          >
            Volver al inicio
          </Link>
          <WhatsAppButton source="demo-coming-soon" />
        </div>
      </Container>
    </main>
  );
}
