import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/db/schema";

function createDb() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL no está definida. Revisá tu archivo .env.local.");
  }

  const sql = neon(connectionString);
  return drizzle(sql, { schema });
}

let cached: ReturnType<typeof createDb> | undefined;

export const db = new Proxy({} as ReturnType<typeof createDb>, {
  get(_target, prop) {
    if (!cached) cached = createDb();
    return cached[prop as keyof typeof cached];
  },
});
