"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { clientes, projects, usuarios } from "@/db/schema";
import { requireSuperadmin } from "@/lib/auth/actor";

/** Superadmin-only actions: every one checks the role on the server before writing. */

export type FormResult = { ok: boolean; error?: string; mensaje?: string };

const idSchema = z.coerce.number().int().positive();

const clienteSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre necesita al menos 2 caracteres.").max(120),
  tipo: z.enum(["desarrolladora", "estudio", "loteo"], {
    error: "Elegí un tipo de cliente.",
  }),
});

export async function crearCliente(
  _prev: FormResult | null,
  formData: FormData
): Promise<FormResult> {
  await requireSuperadmin();
  const parsed = clienteSchema.safeParse({
    nombre: formData.get("nombre"),
    tipo: formData.get("tipo"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };

  await db.insert(clientes).values(parsed.data);
  revalidatePath("/admin/clientes");
  return { ok: true, mensaje: `Cliente «${parsed.data.nombre}» creado.` };
}

const usuarioSchema = z
  .object({
    email: z.email("Revisá el email.").max(254),
    nombre: z
      .string()
      .trim()
      .min(2, "El nombre necesita al menos 2 caracteres.")
      .max(120),
    rol: z.enum(["superadmin", "cliente"]),
    clienteId: z.union([z.literal(""), idSchema]),
  })
  .refine((u) => u.rol === "superadmin" || u.clienteId !== "", {
    message: "Un usuario cliente necesita un cliente.",
  });

export async function crearUsuario(
  _prev: FormResult | null,
  formData: FormData
): Promise<FormResult> {
  await requireSuperadmin();
  const parsed = usuarioSchema.safeParse({
    email: String(formData.get("email") ?? "")
      .trim()
      .toLowerCase(),
    nombre: formData.get("nombre"),
    rol: formData.get("rol"),
    clienteId: String(formData.get("clienteId") ?? ""),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };
  const { email, nombre, rol } = parsed.data;
  const clienteId =
    rol === "cliente" && parsed.data.clienteId !== "" ? parsed.data.clienteId : null;

  if (clienteId !== null) {
    const [cliente] = await db
      .select({ id: clientes.id })
      .from(clientes)
      .where(eq(clientes.id, clienteId));
    if (!cliente) return { ok: false, error: "Ese cliente no existe." };
  }

  const [existente] = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(eq(usuarios.email, email));
  if (existente) return { ok: false, error: "Ya hay un usuario con ese email." };

  await db.insert(usuarios).values({ email, nombre, rol, clienteId });
  revalidatePath("/admin/clientes");
  return {
    ok: true,
    mensaje: `Usuario ${email} creado. Ya puede pedir su link de acceso en /admin.`,
  };
}

const asignacionSchema = z.object({
  proyectoId: idSchema,
  clienteId: z.union([z.literal(""), idSchema]),
});

/** Attaches a project to a client, or detaches it (empty client = demo, superadmin only). */
export async function asignarProyecto(
  _prev: FormResult | null,
  formData: FormData
): Promise<FormResult> {
  await requireSuperadmin();
  const parsed = asignacionSchema.safeParse({
    proyectoId: formData.get("proyectoId"),
    clienteId: String(formData.get("clienteId") ?? ""),
  });
  if (!parsed.success) return { ok: false, error: "Elegí un proyecto." };
  const clienteId = parsed.data.clienteId === "" ? null : parsed.data.clienteId;

  if (clienteId !== null) {
    const [cliente] = await db
      .select({ id: clientes.id })
      .from(clientes)
      .where(eq(clientes.id, clienteId));
    if (!cliente) return { ok: false, error: "Ese cliente no existe." };
  }

  const updated = await db
    .update(projects)
    .set({ clienteId })
    .where(eq(projects.id, parsed.data.proyectoId))
    .returning({ name: projects.name });
  if (updated.length === 0) return { ok: false, error: "Ese proyecto no existe." };

  revalidatePath("/admin/clientes");
  revalidatePath("/admin");
  return {
    ok: true,
    mensaje:
      clienteId === null
        ? `«${updated[0].name}» quedó sin cliente.`
        : `«${updated[0].name}» asignado.`,
  };
}
