import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { clientes, projects, usuarios } from "@/db/schema";
import { getActor } from "@/lib/auth/actor";
import { LogoSymbol } from "@/components/brand/Logo";
import { AsignarProyectoForm, CrearClienteForm, CrearUsuarioForm } from "./ClientesForms";

export const metadata: Metadata = {
  title: "Clientes",
  robots: { index: false, follow: false },
};

export const instant = false;

const TIPO_LABEL = {
  desarrolladora: "Desarrolladora",
  estudio: "Estudio",
  loteo: "Loteo",
} as const;

export default async function ClientesPage() {
  await connection();
  const actor = await getActor();
  // Superadmin only. Anyone else gets a 404, so the screen does not reveal it exists.
  if (actor?.rol !== "superadmin") notFound();

  const [clienteList, usuarioList, proyectoList] = await Promise.all([
    db.select().from(clientes).orderBy(asc(clientes.nombre)),
    db.select().from(usuarios).orderBy(asc(usuarios.email)),
    db
      .select({
        id: projects.id,
        name: projects.name,
        slug: projects.slug,
        clienteId: projects.clienteId,
      })
      .from(projects)
      .orderBy(asc(projects.id)),
  ]);
  const opciones = clienteList.map((c) => ({ id: c.id, nombre: c.nombre }));

  return (
    <main className="min-h-screen bg-background px-6 py-12 sm:px-10">
      <div className="mx-auto max-w-6xl space-y-10">
        <header className="flex items-center justify-between gap-4">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <LogoSymbol className="h-6 w-6" />
              <p className="eyebrow">Admin</p>
            </div>
            <h1 className="font-display text-3xl">Clientes y usuarios</h1>
          </div>
          <Link href="/admin" className="btn btn-secondary btn-sm">
            Volver al panel
          </Link>
        </header>

        <div className="grid gap-6 lg:grid-cols-3">
          <CrearClienteForm />
          <CrearUsuarioForm clientes={opciones} />
          <AsignarProyectoForm clientes={opciones} proyectos={proyectoList} />
        </div>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Clientes ({clienteList.length})</h2>
          {clienteList.length === 0 ? (
            <p className="text-sm text-foreground-muted">Todavía no creaste clientes.</p>
          ) : (
            <ul className="divide-y divide-border-subtle rounded-lg border border-border-subtle bg-surface">
              {clienteList.map((c) => {
                const suyos = proyectoList.filter((p) => p.clienteId === c.id);
                const gente = usuarioList.filter((u) => u.clienteId === c.id);
                return (
                  <li key={c.id} className="px-4 py-3 text-sm">
                    <p className="font-medium">
                      {c.nombre}{" "}
                      <span className="text-foreground-muted">
                        · {TIPO_LABEL[c.tipo]}
                      </span>
                    </p>
                    <p className="text-foreground-muted">
                      Proyectos:{" "}
                      {suyos.length ? suyos.map((p) => p.name).join(", ") : "ninguno"}
                    </p>
                    <p className="text-foreground-muted">
                      Usuarios:{" "}
                      {gente.length ? gente.map((u) => u.email).join(", ") : "ninguno"}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Superadmins</h2>
          <p className="text-sm text-foreground-muted">
            {usuarioList
              .filter((u) => u.rol === "superadmin")
              .map((u) => u.email)
              .join(", ") || "Solo la contraseña de administrador (ADMIN_PASSWORD)."}
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Proyectos sin cliente</h2>
          <p className="text-sm text-foreground-muted">
            {proyectoList
              .filter((p) => p.clienteId === null)
              .map((p) => p.name)
              .join(", ") || "Ninguno."}
          </p>
        </section>
      </div>
    </main>
  );
}
