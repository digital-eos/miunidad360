import { notFound, permanentRedirect } from "next/navigation";
import { proyectoPath } from "@/lib/proyectos/rutas";

/** Old links: every client project now lives at /<cliente>/<slug>. */
export default async function ProyectoPage({ params }: PageProps<"/proyectos/[slug]">) {
  const { slug } = await params;
  const path = proyectoPath(slug);
  if (!path) notFound();
  permanentRedirect(path);
}
