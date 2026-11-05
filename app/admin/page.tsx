import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { leads, projects, unidades } from "@/db/schema";
import { toUnidad } from "@/lib/unidades/types";
import { ADMIN_COOKIE_NAME, verifySessionToken } from "@/lib/admin/auth";
import { cn } from "@/lib/utils";
import { AdminLoginForm } from "./AdminLoginForm";
import { UnitsTable } from "./UnitsTable";
import { LeadsTable } from "./LeadsTable";
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
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  const authenticated = await verifySessionToken(token);

  if (!authenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <AdminLoginForm />
      </main>
    );
  }

  const params = await searchParams;
  const requestedSlug = typeof params.proyecto === "string" ? params.proyecto : null;

  const projectList = await db.select().from(projects).orderBy(asc(projects.id));
  const project =
    projectList.find((p) => p.slug === requestedSlug) ??
    projectList.find((p) => p.slug === DEFAULT_PROJECT_SLUG) ??
    projectList[0];

  const unidadList = project
    ? (
        await db
          .select()
          .from(unidades)
          .where(eq(unidades.proyectoId, project.id))
          .orderBy(asc(unidades.id))
      ).map(toUnidad)
    : [];
  const leadList = await db.select().from(leads).orderBy(desc(leads.createdAt)).limit(100);

  return (
    <main className="min-h-screen bg-background px-6 py-12 sm:px-10">
      <div className="mx-auto max-w-6xl space-y-12">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-accent-strong">Admin</p>
            <h1 className="font-display text-3xl">{project?.name ?? "Sin proyectos"}</h1>
          </div>
          <form action={adminLogout}>
            <button
              type="submit"
              className="rounded-full border border-border-subtle px-4 py-2 text-sm font-medium transition-colors duration-200 hover:border-accent hover:text-accent-strong"
            >
              Cerrar sesión
            </button>
          </form>
        </header>

        {projectList.length > 1 ? (
          <nav aria-label="Proyectos" className="flex flex-wrap gap-2">
            {projectList.map((p) => (
              <Link
                key={p.id}
                href={`/admin?proyecto=${p.slug}`}
                aria-current={p.id === project?.id ? "page" : undefined}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-sm transition-colors duration-200",
                  p.id === project?.id
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border-subtle hover:border-accent hover:text-accent-strong",
                )}
              >
                {p.name}
              </Link>
            ))}
          </nav>
        ) : null}

        <section>
          <h2 className="mb-4 font-display text-xl">Unidades ({unidadList.length})</h2>
          <UnitsTable key={project?.id} unidades={unidadList} />
        </section>

        <section>
          <h2 className="mb-4 font-display text-xl">Leads recibidos ({leadList.length})</h2>
          <LeadsTable leads={leadList} />
        </section>
      </div>
    </main>
  );
}
