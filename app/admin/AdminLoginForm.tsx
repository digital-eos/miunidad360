"use client";

import { useActionState } from "react";
import { Logo } from "@/components/brand/Logo";
import { adminLogin, type AdminLoginResult } from "./actions";

const initialState: AdminLoginResult = { success: false };

export function AdminLoginForm() {
  const [state, formAction, isPending] = useActionState(adminLogin, initialState);

  return (
    <form action={formAction} className="w-full max-w-sm space-y-4">
      <div>
        <Logo className="mb-6 h-7" />
        <p className="eyebrow">Admin</p>
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
          className="field"
        />
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="btn btn-primary w-full"
      >
        {isPending ? "Verificando…" : "Entrar"}
      </button>
    </form>
  );
}
