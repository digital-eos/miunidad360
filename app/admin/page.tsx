import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { getActor } from "@/lib/auth/actor";
import { leadsVisibles, proyectosVisibles, unidadesDeProyecto } from "@/lib/admin/datos";
import { cn } from "@/lib/utils";
import { LogoSymbol } from "@/components/brand/Logo";
import { AdminLoginForm } from "./AdminLoginForm";
import { UnitsTable } from "./UnitsTable";
import { LeadsTable } from "./LeadsTable";
import { ProyectoVisibilidad } from "./ProyectoVisibilidad";
import { adminLogout } from "./actions";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

// Always a fresh, request-time render: session cookie and unit/lead data must never be stale.
export const instant = false;

const DEFAULT_PROJECT_SLUG = "edificio-demo";

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  await connection();
  const actor = await getActor();
  const params = await searchParams;

  if (!actor) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <AdminLoginForm errorLink={params.error !== undefined} />
      </main>
    );
  }

  const requestedSlug = typeof params.proyecto === "string" ? params.proyecto : null;

  // Scoped to the actor: a cliente never loads another client's project, whatever the URL says.
  const projectList = await proyectosVisibles(actor);
  const project =
    projectList.find((p) => p.slug === requestedSlug) ??
    projectList.find((p) => p.slug === DEFAULT_PROJECT_SLUG) ??
    projectList[0];

  const [unidadList, leadList] = await Promise.all([
    project ? unidadesDeProyecto(actor, project.id) : Promise.resolve([]),
    leadsVisibles(actor),
  ]);

  return (
    <main className="min-h-screen bg-background px-6 py-12 sm:px-10">
      <div className="mx-auto max-w-6xl space-y-12">
        <header className="flex items-center justify-between gap-4">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <LogoSymbol className="h-6 w-6" />
              <p className="eyebrow">Admin</p>
            </div>
            <h1 className="font-display text-3xl">{project?.name ?? "Sin proyectos"}</h1>
            <p className="mt-1 text-sm text-foreground-muted">
              {actor.email ?? "Contraseña de administrador"} ·{" "}
              {actor.rol === "superadmin" ? "Superadmin" : "Cliente"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {actor.rol === "superadmin" ? (
              <Link href="/admin/clientes" className="btn btn-secondary btn-sm">
                Clientes y usuarios
              </Link>
            ) : null}
            <form action={adminLogout}>
              <button type="submit" className="btn btn-secondary btn-sm">
                Cerrar sesión
              </button>
            </form>
          </div>
        </header>

        {projectList.length === 0 ? (
          <p className="text-sm text-foreground-muted">
            Todavía no tenés proyectos asignados. Escribinos y lo configuramos.
          </p>
        ) : null}

        {projectList.length > 1 ? (
          <nav aria-label="Proyectos" className="flex flex-wrap gap-2">
            {projectList.map((p) => (
              <Link
                key={p.id}
                href={`/admin?proyecto=${p.slug}`}
                aria-current={p.id === project?.id ? "page" : undefined}
                className={cn(
                  "rounded-md border px-4 py-1.5 text-sm transition-colors duration-200",
                  p.id === project?.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border-subtle hover:border-primary hover:text-primary"
                )}
              >
                {p.name}
              </Link>
            ))}
          </nav>
        ) : null}

        {project ? (
          <section>
            <h2 className="mb-3 text-lg font-semibold">Visibilidad</h2>
            <ProyectoVisibilidad
              key={project.id}
              proyecto={{
                id: project.id,
                slug: project.slug,
                privado: project.privado,
                tienePassword: project.passwordHash !== null,
              }}
            />
          </section>
        ) : null}

        <section>
          <h2 className="mb-3 text-lg font-semibold">Unidades ({unidadList.length})</h2>
          <UnitsTable key={project?.id} unidades={unidadList} />
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">
            Leads recibidos ({leadList.length})
          </h2>
          <LeadsTable leads={leadList} />
        </section>
      </div>
    </main>
  );
}
