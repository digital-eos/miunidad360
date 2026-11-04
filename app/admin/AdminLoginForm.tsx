"use client";

import { useActionState } from "react";
import { adminLogin, type AdminLoginResult } from "./actions";

const initialState: AdminLoginResult = { success: false };

export function AdminLoginForm() {
  const [state, formAction, isPending] = useActionState(adminLogin, initialState);

  return (
    <form action={formAction} className="w-full max-w-sm space-y-4">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-accent">Admin</p>
        <h1 className="mt-2 font-display text-2xl">Acceso al back-office</h1>
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
          className="w-full rounded-lg border border-border-subtle bg-background-elevated px-4 py-3 text-sm text-foreground focus:border-accent focus:outline-none"
        />
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-red-400">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-full bg-accent px-6 py-3 text-sm font-medium text-background transition-colors duration-200 hover:bg-[#ffb84f] disabled:opacity-60"
      >
        {isPending ? "Verificando…" : "Entrar"}
      </button>
    </form>
  );
}
