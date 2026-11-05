"use client";

import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { trackDemoClick } from "@/lib/analytics";

const MORE_DEMOS = [
  { kind: "maqueta" as const, href: "/demos/maqueta", title: "Maqueta 3D" },
  { kind: "selector" as const, href: "/demos/selector", title: "Selector de unidades" },
  { kind: "sol" as const, href: "/demos/sol", title: "Asoleamiento" },
];

export function Demos() {
  return (
    <section id="demos" className="border-t border-border-subtle py-4">
      <Container className="flex flex-wrap items-center justify-center gap-2 text-sm text-foreground-muted">
        <span className="font-mono text-xs uppercase tracking-[0.15em]">Más demos:</span>
        {MORE_DEMOS.map((demo, index) => (
          <span key={demo.kind} className="flex items-center gap-2">
            {index > 0 ? <span className="text-border-subtle">·</span> : null}
            <Link
              href={demo.href}
              onClick={() => trackDemoClick(demo.kind)}
              className="font-medium text-foreground transition-colors duration-200 hover:text-accent-strong"
            >
              {demo.title}
            </Link>
          </span>
        ))}
      </Container>
    </section>
  );
}
