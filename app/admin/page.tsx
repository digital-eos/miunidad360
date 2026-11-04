import type { Metadata } from "next";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { leads, projects, units } from "@/db/schema";
import { ADMIN_COOKIE_NAME, verifySessionToken } from "@/lib/admin/auth";
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

const PROJECT_SLUG = "edificio-demo";

export default async function AdminPage() {
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

  const [project] = await db.select().from(projects).where(eq(projects.slug, PROJECT_SLUG)).limit(1);
  const unitList = project
    ? await db
        .select()
        .from(units)
        .where(eq(units.projectId, project.id))
        .orderBy(asc(units.floor), asc(units.letter))
    : [];
  const leadList = await db.select().from(leads).orderBy(desc(leads.createdAt)).limit(100);

  return (
    <main className="min-h-screen bg-background px-6 py-12 sm:px-10">
      <div className="mx-auto max-w-6xl space-y-12">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-accent-strong">Admin</p>
            <h1 className="font-display text-3xl">{project?.name ?? "Edificio Demo"}</h1>
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

        <section>
          <h2 className="mb-4 font-display text-xl">Unidades ({unitList.length})</h2>
          <UnitsTable units={unitList} />
        </section>

        <section>
          <h2 className="mb-4 font-display text-xl">Leads recibidos ({leadList.length})</h2>
          <LeadsTable leads={leadList} />
        </section>
      </div>
    </main>
  );
}
