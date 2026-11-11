import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects, unidades } from "@/db/schema";
import { toUnidad } from "@/lib/unidades/types";
import { accessCookieName, canAccess } from "@/lib/proyectos/acceso";
import { CATALUNA_PROJECT, CATALUNA_SLUG, catalunaUnidades } from "@/lib/three/cataluna-ii";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const [project] = await db.select().from(projects).where(eq(projects.slug, slug)).limit(1);

  // Cataluña II is served from its brochure data until it is seeded (npm run db:seed).
  if (!project && slug === CATALUNA_SLUG) {
    return NextResponse.json(
      {
        project: { id: 0, ...CATALUNA_PROJECT, createdAt: new Date(0).toISOString() },
        unidades: catalunaUnidades(),
      },
      { headers: { "Cache-Control": "public, s-maxage=20, stale-while-revalidate=40" } },
    );
  }

  if (!project) {
    return NextResponse.json({ error: "Proyecto no encontrado." }, { status: 404 });
  }

  // Password-protected projects: same access cookie as their page, and never a shared cache.
  const protegido = project.passwordHash !== null;
  if (protegido) {
    const cookieStore = await cookies();
    if (!canAccess(project, cookieStore.get(accessCookieName(slug))?.value)) {
      return NextResponse.json(
        { error: "Acceso restringido." },
        { status: 401, headers: { "Cache-Control": "private, no-store" } },
      );
    }
  }

  const rows = await db
    .select()
    .from(unidades)
    .where(eq(unidades.proyectoId, project.id))
    .orderBy(asc(unidades.id));

  return NextResponse.json(
    // Never send the password hash to the browser (undefined fields are left out of the JSON).
    { project: { ...project, passwordHash: undefined }, unidades: rows.map(toUnidad) },
    {
      headers: {
        "Cache-Control": protegido
          ? "private, no-store"
          : "public, s-maxage=20, stale-while-revalidate=40",
      },
    },
  );
}
