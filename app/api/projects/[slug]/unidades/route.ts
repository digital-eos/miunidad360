import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects, unidades } from "@/db/schema";
import { toUnidad } from "@/lib/unidades/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const [project] = await db.select().from(projects).where(eq(projects.slug, slug)).limit(1);

  if (!project) {
    return NextResponse.json({ error: "Proyecto no encontrado." }, { status: 404 });
  }

  const rows = await db
    .select()
    .from(unidades)
    .where(eq(unidades.proyectoId, project.id))
    .orderBy(asc(unidades.id));

  return NextResponse.json(
    { project, unidades: rows.map(toUnidad) },
    { headers: { "Cache-Control": "public, s-maxage=20, stale-while-revalidate=40" } },
  );
}
