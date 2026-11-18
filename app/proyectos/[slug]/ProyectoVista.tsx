import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProyectoAcceso, isNoIndex } from "@/lib/proyectos/acceso";
import { PROYECTOS } from "./registro";

/** A client project page, served at /<cliente>/<slug> (app/[cliente]/[proyecto]). */
export async function proyectoMetadata(slug: string): Promise<Metadata> {
  const proyecto = PROYECTOS[slug] ? await getProyectoAcceso(slug) : null;
  if (!proyecto) return { robots: { index: false, follow: false } };

  return {
    title: proyecto.name,
    robots: isNoIndex(proyecto) ? { index: false, follow: false } : undefined,
  };
}

export async function ProyectoVista({ slug }: { slug: string }) {
  const pagina = PROYECTOS[slug];
  const proyecto = pagina ? await getProyectoAcceso(slug) : null;
  if (!pagina || !proyecto) notFound();

  const { Contenido } = pagina;
  return <Contenido />;
}
