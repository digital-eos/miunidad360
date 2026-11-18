import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { accessCookieName, canAccess, getProyectoAcceso, isNoIndex } from "@/lib/proyectos/acceso";
import { PROYECTOS } from "./registro";
import { PasswordForm } from "./PasswordForm";

/**
 * A client project page: the password form until the visitor has access, then the
 * project's own content. Served at /<cliente>/<slug> (app/[cliente]/[proyecto]).
 */
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

  const cookieStore = await cookies();
  if (!canAccess(proyecto, cookieStore.get(accessCookieName(slug))?.value)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <PasswordForm slug={slug} nombre={proyecto.name} />
      </main>
    );
  }

  const { Contenido } = pagina;
  return <Contenido />;
}
