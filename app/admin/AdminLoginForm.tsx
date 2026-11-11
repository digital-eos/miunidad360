"use client";

import { useActionState, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import {
  adminLogin,
  solicitarLinkMagico,
  type AdminLoginResult,
  type LinkMagicoResult,
} from "./actions";

const initialLogin: AdminLoginResult = { success: false };
const initialLink: LinkMagicoResult = { enviado: false };

export function AdminLoginForm({ errorLink = false }: { errorLink?: boolean }) {
  const [linkState, linkAction, isSending] = useActionState(
    solicitarLinkMagico,
    initialLink
  );
  const [loginState, loginAction, isChecking] = useActionState(adminLogin, initialLogin);
  const [conPassword, setConPassword] = useState(false);

  return (
    <div className="w-full max-w-sm space-y-8">
      <div>
        <Logo className="mb-6 h-7" />
        <p className="eyebrow">Admin</p>
        <h1 className="mt-2 font-display text-2xl">Acceso al panel</h1>
      </div>

      {linkState.enviado ? (
        <p
          role="status"
          className="rounded-lg border border-border-subtle bg-surface p-4 text-sm"
        >
          Si tu email tiene una cuenta, te mandamos un link para entrar. Revisá tu casilla
          (y la carpeta de spam). El link vence en 15 minutos.
        </p>
      ) : (
        <form action={linkAction} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              autoFocus
              className="field"
            />
          </div>

          {errorLink && !linkState.error ? (
            <p role="alert" className="text-sm text-danger">
              El link venció o ya se usó. Pedí uno nuevo.
            </p>
          ) : null}
          {linkState.error ? (
            <p role="alert" className="text-sm text-danger">
              {linkState.error}
            </p>
          ) : null}

          <button type="submit" disabled={isSending} className="btn btn-primary w-full">
            {isSending ? "Enviando…" : "Mandame el link"}
          </button>
        </form>
      )}

      <div className="border-t border-border-subtle pt-6">
        {conPassword ? (
          <form action={loginAction} className="space-y-4">
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
                Contraseña de administrador
              </label>
              <input
                id="password"
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

            <button
              type="submit"
              disabled={isChecking}
              className="btn btn-secondary w-full"
            >
              {isChecking ? "Verificando…" : "Entrar"}
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setConPassword(true)}
            className="text-sm text-foreground-muted underline-offset-4 hover:text-primary hover:underline"
          >
            Entrar con contraseña de administrador
          </button>
        )}
      </div>
    </div>
  );
}
