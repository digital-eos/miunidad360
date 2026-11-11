import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins/magic-link";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import { cuentas, sesiones, usuarios, verificaciones } from "@/db/schema";
import { enviarLinkMagico } from "./email";

/**
 * Better Auth: magic-link login for the accounts in `usuarios`.
 *
 * - No public signup: `disableSignUp` blocks unknown emails when the link is verified, and
 *   `solicitarLinkMagico` (app/admin/actions.ts) only asks for a link for existing users.
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
      expiresIn: 60 * 60 * 24 * 7, // 7 días
      updateAge: 60 * 60 * 24,
    },
    account: { fields: { userId: "usuarioId" } },
    emailAndPassword: { enabled: false },
    advanced: {
      database: { generateId: "serial" },
      useSecureCookies: process.env.NODE_ENV === "production",
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax" },
    },
    plugins: [
      magicLink({
        expiresIn: 60 * 15,
        disableSignUp: true,
        storeToken: "hashed",
        sendMagicLink: async ({ email, url }) => enviarLinkMagico(email, url),
      }),
      // Must be last: lets Server Actions set the session cookie.
      nextCookies(),
    ],
  });
}

let cached: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
  if (!cached) cached = createAuth();
  return cached;
}
