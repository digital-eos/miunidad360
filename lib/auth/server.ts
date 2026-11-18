import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import { cuentas, sesiones, usuarios, verificaciones } from "@/db/schema";

export const MIN_PASSWORD_LENGTH = 10;

/**
 * Better Auth: email + password login for the accounts in `usuarios`.
 *
 * - No public signup (`disableSignUp`): a superadmin creates every account in
 *   /admin/clientes and the site generates its password (lib/auth/passwords.ts).
 * - Sessions live in `sesiones`, in an httpOnly, sameSite=lax cookie, secure in production.
 *
 * Built lazily so `next build` never needs the secret.
 */
function createAuth() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error("BETTER_AUTH_SECRET no está definida. Revisá tu archivo .env.local.");
  }

  return betterAuth({
    appName: "MiUnidad360",
    secret,
    baseURL: process.env.BETTER_AUTH_URL,
    database: drizzleAdapter(db, {
      provider: "pg",
      // neon-http has no interactive transactions.
      transaction: false,
      schema: {
        user: usuarios,
        session: sesiones,
        account: cuentas,
        verification: verificaciones,
      },
    }),
    user: { fields: { name: "nombre", image: "imagen" } },
    session: {
      fields: { userId: "usuarioId" },
      expiresIn: 60 * 60 * 24 * 30, // 30 días
      updateAge: 60 * 60 * 24,
    },
    account: { fields: { userId: "usuarioId" } },
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: MIN_PASSWORD_LENGTH,
    },
    advanced: {
      database: { generateId: "serial" },
      useSecureCookies: process.env.NODE_ENV === "production",
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax" },
    },
    // Must be last: lets Server Actions set the session cookie.
    plugins: [nextCookies()],
  });
}

/**
 * False when BETTER_AUTH_SECRET is missing (e.g. not yet set in Vercel). Then client
 * accounts are off, but /admin still loads and the ADMIN_PASSWORD login keeps working.
 */
export function authConfigurada(): boolean {
  return Boolean(process.env.BETTER_AUTH_SECRET);
}

let cached: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
  if (!cached) cached = createAuth();
  return cached;
}
