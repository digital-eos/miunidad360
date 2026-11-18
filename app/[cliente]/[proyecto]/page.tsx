import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { CLIENTE_DE_PROYECTO } from "@/lib/proyectos/rutas";
import { ProyectoVista, proyectoMetadata } from "@/app/proyectos/[slug]/ProyectoVista";

// Request-time render: privacy flags and the access cookie must never be stale.
export const instant = false;

/** A project is only served under its own client: /diegovargas/casa-citra, nothing else. */
function esDelCliente(cliente: string, proyecto: string) {
  return CLIENTE_DE_PROYECTO[proyecto] === cliente;
}

export async function generateMetadata({
  params,
}: PageProps<"/[cliente]/[proyecto]">): Promise<Metadata> {
  await connection();
  const { cliente, proyecto } = await params;
  if (!esDelCliente(cliente, proyecto)) return { robots: { index: false, follow: false } };
  return proyectoMetadata(proyecto);
}

export default async function ClienteProyectoPage({ params }: PageProps<"/[cliente]/[proyecto]">) {
  await connection();
  const { cliente, proyecto } = await params;
  if (!esDelCliente(cliente, proyecto)) notFound();
  return <ProyectoVista slug={proyecto} />;
}
