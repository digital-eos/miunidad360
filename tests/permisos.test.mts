/**
 * Authorization test: a cliente user can neither read nor modify another client's project,
 * even by calling the Server Actions directly with the other client's ids.
 *
 * Runs against the database in .env.local (`npm run test:permisos`). It creates two
 * throwaway clients, each with one project and one unit, and deletes them at the end.
 * Only "who is calling" is mocked; the actions, permission checks and SQL are the real ones.
 */
import { after, before, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import type { Actor } from "@/lib/auth/permisos";

let actorActual: Actor | null = null;

class NoAutorizado extends Error {}

mock.module("@/lib/auth/actor", {
  namedExports: {
    getActor: async () => actorActual,
    requireActor: async () => {
      if (!actorActual) throw new NoAutorizado("No autorizado.");
      return actorActual;
    },
    requireSuperadmin: async () => {
      if (actorActual?.rol !== "superadmin") throw new NoAutorizado("No autorizado.");
      return actorActual;
    },
  },
});
mock.module("next/cache", { namedExports: { revalidatePath: () => {} } });

const { db } = await import("@/lib/db");
const { clientes, projects, unidades, leads } = await import("@/db/schema");
const actions = await import("@/app/admin/actions");
const clienteActions = await import("@/app/admin/clientes/actions");
const datos = await import("@/lib/admin/datos");

const tag = `test-${randomUUID().slice(0, 8)}`;
type Fixture = { clienteId: number; proyectoId: number; unidadId: number; slug: string };
let a: Fixture;
let b: Fixture;
let actorA: Actor;

async function crearFixture(nombre: string): Promise<Fixture> {
  const [cliente] = await db
    .insert(clientes)
    .values({ nombre: `${tag} ${nombre}`, tipo: "desarrolladora" })
    .returning();
  const slug = `${tag}-${nombre.toLowerCase()}`;
  const [proyecto] = await db
    .insert(projects)
    .values({
      slug,
      name: `${tag} ${nombre}`,
      address: "Test 123",
      city: "Test",
      clienteId: cliente.id,
    })
    .returning();
  const [unidad] = await db
    .insert(unidades)
    .values({
      proyectoId: proyecto.id,
      tipo: "departamento",
      codigo: "UF 1",
      superficieM2: "50",
      precio: 100_000,
    })
    .returning();
  await db
    .insert(leads)
    .values({
      name: "Lead",
      email: "lead@example.com",
      source: tag,
      projectId: proyecto.id,
    });
  return { clienteId: cliente.id, proyectoId: proyecto.id, unidadId: unidad.id, slug };
}

async function snapshot(f: Fixture) {
  const [p] = await db.select().from(projects).where(eq(projects.id, f.proyectoId));
  const [u] = await db.select().from(unidades).where(eq(unidades.id, f.unidadId));
  return {
    privado: p.privado,
    passwordHash: p.passwordHash,
    clienteId: p.clienteId,
    precio: u.precio,
    estado: u.estado,
  };
}

/** Must fail with the authorization error, not any unrelated error. */
function denegado(p: Promise<unknown>) {
  return assert.rejects(p, /No autorizado/);
}

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

before(async () => {
  a = await crearFixture("A");
  b = await crearFixture("B");
  actorA = {
    rol: "cliente",
    usuarioId: 0,
    clienteId: a.clienteId,
    email: "a@example.com",
  };
});

after(async () => {
  const ids = [a?.proyectoId, b?.proyectoId].filter(Boolean) as number[];
  if (ids.length) {
    await db.delete(leads).where(inArray(leads.projectId, ids));
    await db.delete(projects).where(inArray(projects.id, ids)); // cascades to unidades
  }
  const cIds = [a?.clienteId, b?.clienteId].filter(Boolean) as number[];
  if (cIds.length) await db.delete(clientes).where(inArray(clientes.id, cIds));
});

describe("cliente A frente al proyecto del cliente B", () => {
  it("no lo ve en sus lecturas", async () => {
    const proyectos = await datos.proyectosVisibles(actorA);
    const ids = proyectos.map((p) => p.id);
    assert.ok(ids.includes(a.proyectoId));
    assert.ok(!ids.includes(b.proyectoId));
    assert.ok(proyectos.every((p) => p.clienteId === a.clienteId));

    assert.deepEqual(await datos.unidadesDeProyecto(actorA, b.proyectoId), []);
    assert.equal((await datos.unidadesDeProyecto(actorA, a.proyectoId)).length, 1);

    const leadsA = await datos.leadsVisibles(actorA);
    assert.ok(leadsA.length > 0);
    assert.ok(leadsA.every((l) => l.projectId === a.proyectoId));
  });

  it("no puede modificarlo llamando las Server Actions con ids de B", async () => {
    actorActual = actorA;
    const antes = await snapshot(b);

    await denegado(actions.updateUnidadPrecio(b.unidadId, 1));
    await denegado(actions.updateUnidadEstado(b.unidadId, "vendida"));
    await denegado(actions.updateProyectoPrivado(b.proyectoId, true));
    await denegado(
      actions.setProyectoPassword(b.proyectoId, null, form({ password: "hackeado123" }))
    );
    await denegado(actions.clearProyectoPassword(b.proyectoId));

    assert.deepEqual(await snapshot(b), antes);
  });

  it("no puede usar las acciones de superadmin", async () => {
    actorActual = actorA;
    const antes = await snapshot(b);
    await denegado(
      clienteActions.asignarProyecto(
        null,
        form({ proyectoId: String(b.proyectoId), clienteId: String(a.clienteId) })
      )
    );
    await denegado(
      clienteActions.crearCliente(
        null,
        form({ nombre: `${tag} intruso`, tipo: "estudio" })
      )
    );
    await denegado(
      clienteActions.crearUsuario(
        null,
        form({
          email: `${tag}@example.com`,
          nombre: "Intruso",
          rol: "superadmin",
          clienteId: "",
        })
      )
    );
    assert.deepEqual(await snapshot(b), antes);
  });

  it("sí puede modificar su propio proyecto (control positivo)", async () => {
    actorActual = actorA;
    await actions.updateUnidadPrecio(a.unidadId, 123_456);
    await actions.updateProyectoPrivado(a.proyectoId, true);
    const ahora = await snapshot(a);
    assert.equal(ahora.precio, 123_456);
    assert.equal(ahora.privado, true);
  });

  it("sin sesión no puede hacer nada", async () => {
    actorActual = null;
    await denegado(actions.updateUnidadPrecio(a.unidadId, 1));
    await denegado(actions.updateProyectoPrivado(a.proyectoId, false));
  });

  it("un superadmin sí puede modificar el proyecto de B", async () => {
    actorActual = { rol: "superadmin", usuarioId: null, clienteId: null, email: null };
    await actions.updateUnidadEstado(b.unidadId, "reservada");
    assert.equal((await snapshot(b)).estado, "reservada");
  });
});
