"use client";

import { useActionState } from "react";
import { Logo } from "@/components/brand/Logo";
import { unlockProyecto, type UnlockResult } from "./actions";

const initialState: UnlockResult = {};

export function PasswordForm({ slug, nombre }: { slug: string; nombre: string }) {
  const [state, formAction, isPending] = useActionState(
    unlockProyecto.bind(null, slug),
    initialState,
  );

  return (
    <form action={formAction} className="w-full max-w-sm space-y-4">
      <div>
        <Logo className="mb-6 h-7" />
        <p className="eyebrow">Proyecto privado</p>
        <h1 className="mt-2 font-display text-2xl">{nombre}</h1>
        <p className="mt-2 text-sm leading-relaxed text-foreground-muted">
          Ingresá la contraseña que te compartieron para ver el proyecto.
        </p>
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoFocus
          autoComplete="current-password"
          className="field"
        />
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <button type="submit" disabled={isPending} className="btn btn-primary w-full">
        {isPending ? "Verificando…" : "Ver el proyecto"}
      </button>
    </form>
  );
}
