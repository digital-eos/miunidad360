import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { Logo } from "@/components/brand/Logo";

const NAV_LINKS = [
  { href: "/#como-funciona", label: "Cómo funciona" },
  { href: "/#resultado", label: "El resultado" },
  { href: "/#demos", label: "Demos" },
  { href: "/#contacto", label: "Contacto" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border-subtle bg-background">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link href="/" aria-label="miunidad360, inicio" className="shrink-0">
          <Logo className="h-6 sm:h-7" />
        </Link>
        <nav
          aria-label="Principal"
          className="hidden items-center gap-1 text-sm font-medium text-foreground-muted md:flex"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 transition-colors duration-150 hover:bg-surface-muted hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <WhatsAppButton
          source="header"
          label="WhatsApp"
          className="btn-sm hidden min-[380px]:inline-flex"
        />
      </Container>
    </header>
  );
}
