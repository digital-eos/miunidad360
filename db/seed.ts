import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import { defaultBuildingConfig, apartmentId } from "@/lib/three/building-config";
import { apartmentOrientation } from "@/lib/three/building-layout";
import { UNIT_PLAN_PROFILES, computeUnitPrice, assignUnitStatuses } from "@/lib/units/demo-data";
import { APARTMENT_LETTERS } from "@/lib/three/building-config";

const PROJECT_SLUG = "edificio-demo";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL no está definida. Revisá tu archivo .env.local.");
  }

  const sql = neon(connectionString);
  const db = drizzle(sql, { schema });

  const [project] = await db
    .insert(schema.projects)
    .values({
      slug: PROJECT_SLUG,
      name: "Edificio Demo",
      address: "Av. Figueroa Alcorta 1234",
      city: "Buenos Aires, Argentina",
      latitude: -34.5755,
      longitude: -58.4338,
      description:
        "Proyecto 100% ficticio, creado únicamente para mostrar el selector de unidades de MiUnidad360.",
    })
    .onConflictDoUpdate({
      target: schema.projects.slug,
      set: {
        name: "Edificio Demo",
        address: "Av. Figueroa Alcorta 1234",
        city: "Buenos Aires, Argentina",
        latitude: -34.5755,
        longitude: -58.4338,
        description:
          "Proyecto 100% ficticio, creado únicamente para mostrar el selector de unidades de MiUnidad360.",
      },
    })
    .returning();

  const { floors, apartmentsPerFloor } = defaultBuildingConfig;
  if (apartmentsPerFloor !== APARTMENT_LETTERS.length) {
    throw new Error("La configuración del edificio no coincide con las letras de apartamento.");
  }

  const totalUnits = floors * apartmentsPerFloor;
  const statuses = assignUnitStatuses(totalUnits);

  const rows: schema.NewUnit[] = [];
  let i = 0;
  for (let floor = 1; floor <= floors; floor += 1) {
    for (const letter of APARTMENT_LETTERS) {
      const profile = UNIT_PLAN_PROFILES[letter];
      rows.push({
        projectId: project.id,
        code: apartmentId(floor, letter),
        floor,
        letter,
        rooms: profile.rooms,
        bedrooms: profile.bedrooms,
        areaM2: profile.areaM2.toFixed(2),
        balconyM2: profile.balconyM2.toFixed(2),
        priceUsd: computeUnitPrice(floor, letter),
        status: statuses[i],
        orientation: apartmentOrientation(letter),
        planType: profile.planType,
      });
      i += 1;
    }
  }

  await db.delete(schema.units).where(eq(schema.units.projectId, project.id));
  await db.insert(schema.units).values(rows);

  const counts = rows.reduce(
    (acc, row) => {
      acc[row.status as string] = (acc[row.status as string] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  console.log(
    `Seed completo: proyecto "${project.name}" (${project.slug}) con ${rows.length} unidades.`,
  );
  console.log("Distribución de estados:", counts);
}

main().catch((error) => {
  console.error("Error al ejecutar el seed:", error);
  process.exitCode = 1;
});
