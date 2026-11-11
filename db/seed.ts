import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import {
  defaultBuildingConfig,
  apartmentId,
  APARTMENT_LETTERS,
} from "@/lib/three/building-config";
import { apartmentOrientation } from "@/lib/three/building-layout";
import {
  UNIT_PLAN_PROFILES,
  computeUnitPrice,
  assignUnitStatuses,
} from "@/lib/units/demo-data";
import { BIM_PROJECT_SLUG, bimFallbackUnidades } from "@/lib/bim/dataset";
import {
  LOTES_PROJECT_NAME,
  LOTES_PROJECT_SLUG,
  buildLotesUnidades,
} from "@/lib/lotes/data";
import type { Unidad } from "@/lib/unidades/types";
import {
  CATALUNA_PROJECT,
  CATALUNA_SLUG,
  catalunaUnidades,
} from "@/lib/three/cataluna-ii";

/**
 * Seeds the demo projects. Existing units are left untouched (so prices and statuses
 * edited in /admin survive a re-seed); pass --reset to rewrite every unit from scratch.
 *
 *   npm run db:seed
 *   npm run db:seed -- --reset
 */
const RESET = process.argv.includes("--reset");

type ProjectSeed = Omit<schema.NewProject, "id" | "createdAt"> & { slug: string };

const PROJECTS: ProjectSeed[] = [
  {
    slug: "edificio-demo",
    name: "Edificio Demo",
    address: "Av. Figueroa Alcorta 1234",
    city: "Buenos Aires, Argentina",
    latitude: -34.5755,
    longitude: -58.4338,
    description:
      "Proyecto 100% ficticio, creado únicamente para mostrar el selector de unidades de MiUnidad360.",
  },
  CATALUNA_PROJECT,
  {
    slug: BIM_PROJECT_SLUG,
    name: "Schependomlaan",
    address: "Schependomlaan",
    city: "Nijmegen, Países Bajos",
    latitude: null,
    longitude: null,
    description:
      "Dataset BIM abierto «Schependomlaan» (ROOT bv, Hendriks Bouw en Ontwikkeling, TU Eindhoven, CC BY 4.0). Precios y estados ficticios.",
  },
  {
    slug: LOTES_PROJECT_SLUG,
    name: LOTES_PROJECT_NAME,
    address: "Barrio cerrado ficticio",
    city: "Provincia de Buenos Aires, Argentina",
    latitude: null,
    longitude: null,
    description: "Barrio ficticio. Datos e imágenes ilustrativos.",
  },
];

function edificioDemoUnidades(): Unidad[] {
  const { floors, apartmentsPerFloor } = defaultBuildingConfig;
  if (apartmentsPerFloor !== APARTMENT_LETTERS.length) {
    throw new Error(
      "La configuración del edificio no coincide con las letras de apartamento."
    );
  }
  const statuses = assignUnitStatuses(floors * apartmentsPerFloor);
  const rows: Unidad[] = [];
  let i = 0;
  for (let floor = 1; floor <= floors; floor += 1) {
    for (const letter of APARTMENT_LETTERS) {
      const profile = UNIT_PLAN_PROFILES[letter];
      const code = apartmentId(floor, letter);
      rows.push({
        id: 0,
        proyectoId: 0,
        tipo: "departamento",
        codigo: code,
        sector: `Piso ${floor}`,
        superficieM2: profile.areaM2,
        superficieTerrenoM2: null,
        orientacion: apartmentOrientation(letter),
        precio: computeUnitPrice(floor, letter),
        moneda: "USD",
        estado: statuses[i],
        objeto3d: code,
        atributos: {
          piso: floor,
          letra: letter,
          ambientes: profile.rooms,
          dormitorios: profile.bedrooms,
          balcon_m2: profile.balconyM2,
          tipologia: profile.planType,
        },
      });
      i += 1;
    }
  }
  return rows;
}

const UNIDADES_BY_PROJECT: Record<string, () => Unidad[]> = {
  "edificio-demo": edificioDemoUnidades,
  [CATALUNA_SLUG]: catalunaUnidades,
  [BIM_PROJECT_SLUG]: () => bimFallbackUnidades,
  [LOTES_PROJECT_SLUG]: () => buildLotesUnidades(),
};

function toRow(u: Unidad, proyectoId: number): schema.NewUnidad {
  return {
    proyectoId,
    tipo: u.tipo,
    codigo: u.codigo,
    sector: u.sector,
    superficieM2: u.superficieM2.toFixed(2),
    superficieTerrenoM2:
      u.superficieTerrenoM2 == null ? null : u.superficieTerrenoM2.toFixed(2),
    orientacion: u.orientacion,
    precio: u.precio,
    moneda: u.moneda,
    estado: u.estado,
    objeto3d: u.objeto3d,
    atributos: u.atributos,
  };
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL no está definida. Revisá tu archivo .env.local.");
  }

  const db = drizzle(neon(connectionString), { schema });

  for (const seed of PROJECTS) {
    const { slug, ...fields } = seed;
    const [project] = await db
      .insert(schema.projects)
      .values({ slug, ...fields })
      .onConflictDoUpdate({ target: schema.projects.slug, set: fields })
      .returning();

    const rows = UNIDADES_BY_PROJECT[slug]().map((u) => toRow(u, project.id));
    if (RESET) {
      await db.delete(schema.unidades).where(eq(schema.unidades.proyectoId, project.id));
    }
    const inserted = await db
      .insert(schema.unidades)
      .values(rows)
      .onConflictDoNothing({
        target: [schema.unidades.proyectoId, schema.unidades.codigo],
      })
      .returning({ id: schema.unidades.id });

    console.log(
      `${project.name} (${project.slug}): ${rows.length} unidades, ${inserted.length} nuevas.`
    );
  }

  await seedCuentas(db);
}

/**
 * A test client with one user, owner of barrio-demo, to try the cliente role in /admin.
 * The other demo projects stay without a client (superadmin only). Idempotent.
 */
const CLIENTE_PRUEBA = { nombre: "Cliente de prueba", tipo: "loteo" as const };
const USUARIO_PRUEBA = {
  email: "cliente.prueba@example.com",
  nombre: "Usuario de prueba",
};
const PROYECTO_PRUEBA = LOTES_PROJECT_SLUG; // barrio-demo

async function seedCuentas(db: ReturnType<typeof drizzle<typeof schema>>) {
  let [cliente] = await db
    .select()
    .from(schema.clientes)
    .where(eq(schema.clientes.nombre, CLIENTE_PRUEBA.nombre))
    .limit(1);
  if (!cliente) {
    [cliente] = await db.insert(schema.clientes).values(CLIENTE_PRUEBA).returning();
  }

  await db
    .insert(schema.usuarios)
    .values({ ...USUARIO_PRUEBA, rol: "cliente", clienteId: cliente.id })
    .onConflictDoNothing({ target: schema.usuarios.email });

  await db
    .update(schema.projects)
    .set({ clienteId: cliente.id })
    .where(eq(schema.projects.slug, PROYECTO_PRUEBA));

  console.log(
    `Cuentas: «${cliente.nombre}» (id ${cliente.id}), usuario ${USUARIO_PRUEBA.email}, dueño de ${PROYECTO_PRUEBA}.`
  );
}

main().catch((error) => {
  console.error("Error al ejecutar el seed:", error);
  process.exitCode = 1;
});
