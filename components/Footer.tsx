import Link from "next/link";
import { Container } from "@/components/ui/Container";

export function Footer() {
  return (
    <footer className="border-t border-border-subtle py-10">
      <Container className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
        <div>
          <p className="font-display text-lg">MiUnidad360</p>
          <p className="mt-1 text-sm text-foreground-muted">
            MiUnidad360 es un producto de Digital EOS.
          </p>
        </div>
        <nav className="flex flex-wrap gap-6 text-sm text-foreground-muted">
          <Link href="#demos" className="hover:text-foreground">
            Demos
          </Link>
          <Link href="#contacto" className="hover:text-foreground">
            Contacto
          </Link>
          <Link href="/privacidad" className="hover:text-foreground">
            Privacidad
          </Link>
        </nav>
      </Container>
    </footer>
  );
}
