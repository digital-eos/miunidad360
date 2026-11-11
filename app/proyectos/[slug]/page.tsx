import type { Metadata } from "next";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { accessCookieName, canAccess, getProyectoAcceso, isNoIndex } from "@/lib/proyectos/acceso";
import { PROYECTOS } from "./registro";
import { PasswordForm } from "./PasswordForm";

// Request-time render: privacy flags and the access cookie must never be stale.
export const instant = false;

export async function generateMetadata({
  params,
}: PageProps<"/proyectos/[slug]">): Promise<Metadata> {
  await connection();
  const { slug } = await params;
  const proyecto = PROYECTOS[slug] ? await getProyectoAcceso(slug) : null;
  if (!proyecto) return { robots: { index: false, follow: false } };

  return {
    title: proyecto.name,
    robots: isNoIndex(proyecto) ? { index: false, follow: false } : undefined,
  };
}

export default async function ProyectoPage({ params }: PageProps<"/proyectos/[slug]">) {
  await connection();
  const { slug } = await params;
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
