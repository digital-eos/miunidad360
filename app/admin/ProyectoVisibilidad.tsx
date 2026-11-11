"use client";

import { useActionState, useTransition } from "react";
import {
  clearProyectoPassword,
  setProyectoPassword,
  updateProyectoPrivado,
  type ProyectoPasswordResult,
} from "./actions";

const initialState: ProyectoPasswordResult = { success: false };

/** Per-project privacy: private link (noindex) and optional password. */
export function ProyectoVisibilidad({
  proyecto,
}: {
  proyecto: { id: number; slug: string; privado: boolean; tienePassword: boolean };
}) {
  const [isPending, startTransition] = useTransition();
  const [state, formAction, isSaving] = useActionState(
    setProyectoPassword.bind(null, proyecto.id),
    initialState,
  );

  return (
    <div className="space-y-5 rounded-lg border border-border-subtle bg-surface p-5">
      <p className="text-sm text-foreground-muted">
        Página del proyecto:{" "}
        <code className="rounded bg-surface-muted px-1.5 py-0.5">/proyectos/{proyecto.slug}</code>{" "}
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
            Los buscadores no indexan la página y no aparece en el sitemap.
          </span>
        </span>
      </label>

      <div>
        <p className="text-sm font-semibold">
          Contraseña{" "}
          <span className="font-normal text-foreground-muted">
            · {proyecto.tienePassword ? "activa" : "sin contraseña"}
          </span>
        </p>
        <form action={formAction} className="mt-2 flex flex-wrap items-center gap-2">
          <input
            name="password"
            type="password"
            required
            autoComplete="new-password"
            aria-label="Nueva contraseña del proyecto"
            placeholder={proyecto.tienePassword ? "Nueva contraseña" : "Definir contraseña"}
            className="field h-9 max-w-xs"
          />
          <button type="submit" disabled={isSaving} className="btn btn-primary btn-sm">
            {isSaving ? "Guardando…" : "Guardar"}
          </button>
          {proyecto.tienePassword ? (
            <button
              type="button"
              disabled={isPending}
              onClick={() => startTransition(() => clearProyectoPassword(proyecto.id))}
              className="btn btn-secondary btn-sm"
            >
              Quitar contraseña
            </button>
          ) : null}
        </form>
        {state.error ? (
          <p role="alert" className="mt-2 text-sm text-danger">
            {state.error}
          </p>
        ) : null}
        {state.success ? (
          <p className="mt-2 text-sm text-primary">
            Contraseña guardada. Quienes ya habían entrado tienen que ingresarla de nuevo.
          </p>
        ) : null}
        <p className="mt-2 text-xs text-foreground-muted">
          Con contraseña, la página tampoco se indexa. Se guarda como hash, nunca en texto plano: no se puede ver
          después.
        </p>
      </div>
    </div>
  );
}
