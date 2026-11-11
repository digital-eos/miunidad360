import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects } from "@/db/schema";

/**
 * Privacy of a client project page (app/proyectos/[slug]):
 * - `privado`: the page is reachable by its link but not indexed nor in the sitemap.
 * - `passwordHash`: the page and its units API ask for a password first.
 *
 * Passwords are stored as scrypt hashes. Access is a signed cookie per project, tied to the
 * current hash: changing or removing the password logs everyone out of that project.
 */

const ACCESS_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 días
export const ACCESS_TTL_SECONDS = ACCESS_TTL_MS / 1000;
export const MIN_PASSWORD_LENGTH = 6;

export type ProyectoAcceso = {
  id: number;
  slug: string;
  name: string;
  privado: boolean;
  passwordHash: string | null;
};

export async function getProyectoAcceso(slug: string): Promise<ProyectoAcceso | null> {
  const [row] = await db
    .select({
      id: projects.id,
      slug: projects.slug,
      name: projects.name,
      privado: projects.privado,
      passwordHash: projects.passwordHash,
    })
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1);
  return row ?? null;
}

/** A project with a password is never indexed either. */
export function isNoIndex(p: Pick<ProyectoAcceso, "privado" | "passwordHash">): boolean {
  return p.privado || p.passwordHash !== null;
}

// ---- Passwords ----

const SCRYPT_KEYLEN = 32;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
  return `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltB64, hashB64] = stored.split("$");
  if (scheme !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64url");
  const actual = crypto.scryptSync(password, Buffer.from(saltB64, "base64url"), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

// ---- Access cookie ----

function getSecret(): string {
  // Same secret as the admin session, with its own HMAC context below.
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET no está definida. Revisá tu archivo .env.local.");
  }
  return secret;
}

export function accessCookieName(slug: string): string {
  return `proyecto_${slug}`;
}

/** Short fingerprint of the stored hash: a new password invalidates old cookies. */
function hashVersion(passwordHash: string): string {
  return crypto.createHash("sha256").update(passwordHash).digest("base64url").slice(0, 16);
}

function sign(payloadB64: string): string {
  return crypto
    .createHmac("sha256", getSecret())
    .update(`proyecto:${payloadB64}`)
    .digest("base64url");
}

export function createAccessToken(slug: string, passwordHash: string): string {
  const payload = JSON.stringify({ s: slug, v: hashVersion(passwordHash), exp: Date.now() + ACCESS_TTL_MS });
  const payloadB64 = Buffer.from(payload).toString("base64url");
  return `${payloadB64}.${sign(payloadB64)}`;
}

export function verifyAccessToken(
  token: string | undefined | null,
  slug: string,
  passwordHash: string,
): boolean {
  if (!token) return false;
  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) return false;

  const signatureBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(sign(payloadB64));
  if (signatureBuf.length !== expectedBuf.length) return false;
  if (!crypto.timingSafeEqual(signatureBuf, expectedBuf)) return false;

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString()) as {
      s?: string;
      v?: string;
      exp?: number;
    };
    return (
      payload.s === slug &&
      payload.v === hashVersion(passwordHash) &&
      typeof payload.exp === "number" &&
      payload.exp > Date.now()
    );
  } catch {
    return false;
  }
}

/** True when the visitor may see the project: no password, or a valid access cookie. */
export function canAccess(
  proyecto: Pick<ProyectoAcceso, "slug" | "passwordHash">,
  cookieValue: string | undefined,
): boolean {
  if (proyecto.passwordHash === null) return true;
  return verifyAccessToken(cookieValue, proyecto.slug, proyecto.passwordHash);
}
