"use client";

import { useTransition } from "react";
import { updateProyectoPrivado } from "./actions";
import { proyectoPath } from "@/lib/proyectos/rutas";

/** Per-project visibility: private link (not indexed, not in the sitemap). */
export function ProyectoVisibilidad({
  proyecto,
}: {
  proyecto: { id: number; slug: string; privado: boolean };
}) {
  const link = proyectoPath(proyecto.slug);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-5 rounded-lg border border-border-subtle bg-surface p-5">
      <p className="text-sm text-foreground-muted">
        Página del proyecto:{" "}
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener"
            className="rounded bg-surface-muted px-1.5 py-0.5 font-mono text-foreground underline-offset-2 hover:underline"
          >
            {link}
          </a>
        ) : (
          <span>sin página de cliente</span>
        )}{" "}
        (las demos de /demos son siempre públicas).
      </p>

      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          defaultChecked={proyecto.privado}
          disabled={isPending}
          onChange={(e) => {
            const privado = e.target.checked;
            startTransition(() => updateProyectoPrivado(proyecto.id, privado));
          }}
          className="mt-1 h-4 w-4 accent-[var(--color-primary)]"
        />
        <span>
          <span className="block text-sm font-semibold">Link privado</span>
          <span className="block text-sm text-foreground-muted">
            Los buscadores no indexan la página y no aparece en el sitemap. Quien tenga el
            link la puede ver.
          </span>
        </span>
      </label>
    </div>
  );
}
