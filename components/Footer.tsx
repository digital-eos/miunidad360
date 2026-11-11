import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Logo } from "@/components/brand/Logo";

/** `credits`: attribution for third-party material shown on the page (e.g. CC BY licences). */
export function Footer({ credits }: { credits?: string }) {
  return (
    <footer className="border-t border-border-subtle bg-surface py-10">
      <Container className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
        <div>
          <Logo className="h-6" />
          <p className="mt-2 text-sm text-foreground-muted">
            Un producto de Digital EOS.
          </p>
        </div>
        <nav aria-label="Pie de página" className="flex flex-wrap gap-6 text-sm text-foreground-muted">
          <Link href="/demos" className="transition-colors duration-150 hover:text-primary">
            Demos
          </Link>
          <Link href="/#contacto" className="transition-colors duration-150 hover:text-primary">
            Contacto
          </Link>
          <Link href="/privacidad" className="transition-colors duration-150 hover:text-primary">
            Privacidad
          </Link>
        </nav>
      </Container>
      {credits ? (
        <Container>
          <p className="mt-6 text-xs leading-relaxed text-foreground-subtle">{credits}</p>
        </Container>
      ) : null}
    </footer>
  );
}
