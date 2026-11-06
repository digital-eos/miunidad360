import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { WhatsAppButton } from "@/components/WhatsAppButton";

const NAV_LINKS = [
  { href: "/#fidelidad", label: "Fidelidad" },
  { href: "/#resultado", label: "El resultado" },
  { href: "/#demos", label: "Demos" },
  { href: "/#como-lo-recibis", label: "Cómo lo recibís" },
  { href: "/#contacto", label: "Contacto" },
];

export function Header() {
  return (
    <header className="absolute inset-x-0 top-0 z-40">
      <Container className="flex items-center justify-between gap-4 py-6">
        <Link href="/" className="font-display text-lg tracking-tight">
          MiUnidad360
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-foreground-muted md:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>
        <WhatsAppButton source="header" label="WhatsApp" className="px-4 py-2" />
      </Container>
    </header>
  );
}
