import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects, units } from "@/db/schema";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const [project] = await db.select().from(projects).where(eq(projects.slug, slug)).limit(1);

  if (!project) {
    return NextResponse.json({ error: "Proyecto no encontrado." }, { status: 404 });
  }

  const unitList = await db
    .select()
    .from(units)
    .where(eq(units.projectId, project.id))
    .orderBy(asc(units.floor), asc(units.letter));

  return NextResponse.json(
    { project, units: unitList },
    { headers: { "Cache-Control": "public, s-maxage=20, stale-while-revalidate=40" } },
  );
}
