import { connection } from "next/server";
import { notFound, permanentRedirect } from "next/navigation";
import { proyectoPath } from "@/lib/proyectos/rutas";

// Request-time only: there is nothing to prerender, every visit is redirected.
export const instant = false;

/** Old links: every client project now lives at /<cliente>/<slug>. */
export default async function ProyectoPage({ params }: PageProps<"/proyectos/[slug]">) {
  await connection();
  const { slug } = await params;
  const path = proyectoPath(slug);
  if (!path) notFound();
  permanentRedirect(path);
}
