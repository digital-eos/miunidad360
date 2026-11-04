import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { WhatsAppButton } from "@/components/WhatsAppButton";

export function Header() {
  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <Container className="flex items-center justify-between py-6">
        <Link href="/" className="font-display text-lg tracking-tight">
          MiUnidad360
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-foreground-muted sm:flex">
          <Link href="/#demos" className="hover:text-foreground">
            Demos
          </Link>
          <Link href="/#contacto" className="hover:text-foreground">
            Contacto
          </Link>
        </nav>
        <WhatsAppButton
          source="header"
          variant="outline"
          label="WhatsApp"
          className="px-4 py-2"
        />
      </Container>
    </header>
  );
}
