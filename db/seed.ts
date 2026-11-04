import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL no está definida. Revisá tu archivo .env.local.");
  }

  const sql = neon(connectionString);
  const db = drizzle(sql, { schema });

  await db.insert(schema.leads).values({
    name: "Lead de prueba",
    email: "prueba@miunidad360.com.ar",
    phone: "+54 9 11 0000-0000",
    company: "Desarrollo de prueba",
    message:
      "Este registro es solo para verificar la conexión a la base de datos en local.",
    source: "seed-script",
  });

  console.log("Seed completo: se insertó un lead de prueba en la tabla 'leads'.");
}

main().catch((error) => {
  console.error("Error al ejecutar el seed:", error);
  process.exitCode = 1;
});
