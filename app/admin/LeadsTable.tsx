import type { Lead } from "@/db/schema";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function LeadsTable({ leads }: { leads: Lead[] }) {
  if (leads.length === 0) {
    return <p className="text-sm text-foreground-muted">Todavía no recibiste leads.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border-subtle bg-surface">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-border-subtle bg-surface-muted label-caps text-foreground-muted">
            <th className="px-4 py-2.5 font-semibold">Nombre</th>
            <th className="px-4 py-2.5 font-semibold">Contacto</th>
            <th className="px-4 py-2.5 font-semibold">Unidad</th>
            <th className="px-4 py-2.5 font-semibold">Origen</th>
            <th className="px-4 py-2.5 font-semibold">Fecha</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id} className="border-b border-border-subtle/60 last:border-0">
              <td className="px-4 py-2.5">{lead.name}</td>
              <td className="px-4 py-2.5">
                <div>{lead.email}</div>
                {lead.phone ? (
                  <div className="text-xs text-foreground-muted">{lead.phone}</div>
                ) : null}
              </td>
              <td className="px-4 py-2.5 tabular-nums">{lead.unitCode ?? "—"}</td>
              <td className="px-4 py-2.5 text-foreground-muted">{lead.source}</td>
              <td className="px-4 py-2.5 text-foreground-muted">{formatDate(lead.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
