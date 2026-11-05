"use client";

import { useState, useTransition } from "react";
import type { Unidad } from "@/lib/unidades/types";
import { TIPOS } from "@/lib/unidades/tipos";
import { formatPrecio, formatSuperficie } from "@/lib/unidades/format";
import { STATUS_LABELS, STATUS_ORDER } from "@/lib/units/status-colors";
import { updateUnidadEstado, updateUnidadPrecio } from "./actions";

export function UnitsTable({ unidades }: { unidades: Unidad[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border-subtle">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead>
          <tr className="border-b border-border-subtle text-xs uppercase tracking-wide text-foreground-muted">
            <th className="px-4 py-3">Código</th>
            <th className="px-4 py-3">Tipo</th>
            <th className="px-4 py-3">Sector</th>
            <th className="px-4 py-3">Superficie</th>
            <th className="px-4 py-3">Orientación</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Precio</th>
          </tr>
        </thead>
        <tbody>
          {unidades.map((u) => (
            <UnidadRow key={u.id} unidad={u} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UnidadRow({ unidad }: { unidad: Unidad }) {
  const [isPending, startTransition] = useTransition();
  const [precio, setPrecio] = useState(unidad.precio ?? 0);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const config = TIPOS[unidad.tipo];

  const handleEstadoChange = (estado: string) => {
    startTransition(async () => {
      await updateUnidadEstado(unidad.id, estado as Unidad["estado"]);
      setSavedAt(Date.now());
    });
  };

  const handlePrecioBlur = () => {
    if (precio === unidad.precio || precio <= 0) return;
    startTransition(async () => {
      await updateUnidadPrecio(unidad.id, precio);
      setSavedAt(Date.now());
    });
  };

  return (
    <tr className="border-b border-border-subtle/60 last:border-0">
      <td className="px-4 py-3 font-mono">{unidad.codigo}</td>
      <td className="px-4 py-3">{config.singular}</td>
      <td className="px-4 py-3">{unidad.sector ?? "—"}</td>
      <td className="px-4 py-3">
        {formatSuperficie(unidad.superficieM2, config.superficieFormato)}
      </td>
      <td className="px-4 py-3">{unidad.orientacion ?? "—"}</td>
      <td className="px-4 py-3">
        <select
          defaultValue={unidad.estado}
          onChange={(e) => handleEstadoChange(e.target.value)}
          disabled={isPending}
          aria-label={`Estado de ${unidad.codigo}`}
          className="rounded-md border border-border-subtle bg-background-elevated px-2 py-1 text-sm disabled:opacity-60"
        >
          {STATUS_ORDER.map((estado) => (
            <option key={estado} value={estado}>
              {STATUS_LABELS[estado]}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={precio}
            onChange={(e) => setPrecio(Number(e.target.value))}
            onBlur={handlePrecioBlur}
            disabled={isPending}
            aria-label={`Precio de ${unidad.codigo} en ${unidad.moneda}`}
            className="w-32 rounded-md border border-border-subtle bg-background-elevated px-2 py-1 text-sm disabled:opacity-60"
          />
          <span className="text-xs text-foreground-muted">
            {formatPrecio(precio, unidad.moneda)}
          </span>
          {savedAt ? <span className="text-xs text-accent-strong">✓</span> : null}
        </div>
      </td>
    </tr>
  );
}
