import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { Logo } from "@/components/brand/Logo";

/** Sections of the homepage. The demo catalogue is its own page: see the button below. */
const NAV_LINKS = [
  { href: "/#como-funciona", label: "Cómo funciona" },
  { href: "/#resultado", label: "El resultado" },
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
        <div className="flex shrink-0 items-center gap-2">
          {/* Leaves the homepage, unlike the section links: drawn as a button with an arrow. */}
          <Link href="/demos" className="btn btn-secondary btn-sm">
            Ver demos <span aria-hidden="true">→</span>
          </Link>
          <WhatsAppButton
            source="header"
            label="WhatsApp"
            // Phones keep the floating WhatsApp button; two header buttons don't fit there.
            className="btn-sm hidden min-[480px]:inline-flex"
          />
        </div>
      </Container>
    </header>
  );
}
