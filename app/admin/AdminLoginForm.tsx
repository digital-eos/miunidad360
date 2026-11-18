"use client";

import { useActionState, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import {
  adminLogin,
  iniciarSesion,
  type AdminLoginResult,
  type IniciarSesionResult,
} from "./actions";

const initialLogin: AdminLoginResult = { success: false };
const initialSesion: IniciarSesionResult = {};

export function AdminLoginForm() {
  const [sesionState, sesionAction, isSigningIn] = useActionState(iniciarSesion, initialSesion);
  const [loginState, loginAction, isChecking] = useActionState(adminLogin, initialLogin);
  const [conAdmin, setConAdmin] = useState(false);

  return (
    <div className="w-full max-w-sm space-y-8">
      <div>
        <Logo className="mb-6 h-7" />
        <p className="eyebrow">Mi cuenta</p>
        <h1 className="mt-2 font-display text-2xl">Entrá a tus proyectos</h1>
      </div>

      <form action={sesionAction} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
            autoFocus
            className="field"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="field"
          />
        </div>

        {sesionState.error ? (
          <p role="alert" className="text-sm text-danger">
            {sesionState.error}
          </p>
        ) : null}

        <button type="submit" disabled={isSigningIn} className="btn btn-primary w-full">
          {isSigningIn ? "Entrando…" : "Entrar"}
        </button>
        <p className="text-xs leading-relaxed text-foreground-muted">
          ¿Olvidaste tu contraseña? Escribinos y te generamos una nueva.
        </p>
      </form>

      <div className="border-t border-border-subtle pt-6">
        {conAdmin ? (
          <form action={loginAction} className="space-y-4">
            <div>
              <label htmlFor="admin-password" className="mb-1.5 block text-sm font-medium">
                Contraseña de administrador
              </label>
              <input
                id="admin-password"
                name="password"
                type="password"
                required
                className="field"
              />
            </div>

            {loginState.error ? (
              <p role="alert" className="text-sm text-danger">
                {loginState.error}
              </p>
            ) : null}

            <button type="submit" disabled={isChecking} className="btn btn-secondary w-full">
              {isChecking ? "Verificando…" : "Entrar como administrador"}
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setConAdmin(true)}
            className="text-sm text-foreground-muted underline-offset-4 hover:text-primary hover:underline"
          >
            Entrar con contraseña de administrador
          </button>
        )}
      </div>
    </div>
  );
}
