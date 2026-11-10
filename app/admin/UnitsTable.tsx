"use client";

import { useState, useTransition } from "react";
import type { Unidad } from "@/lib/unidades/types";
import { TIPOS } from "@/lib/unidades/tipos";
import { formatPrecio, formatSuperficie } from "@/lib/unidades/format";
import { STATUS_LABELS, STATUS_ORDER } from "@/lib/units/status-colors";
import { updateUnidadEstado, updateUnidadPrecio } from "./actions";

export function UnitsTable({ unidades }: { unidades: Unidad[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border-subtle bg-surface">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead>
          <tr className="border-b border-border-subtle bg-surface-muted label-caps text-foreground-muted">
            <th className="px-4 py-2.5 font-semibold">Código</th>
            <th className="px-4 py-2.5 font-semibold">Tipo</th>
            <th className="px-4 py-2.5 font-semibold">Sector</th>
            <th className="px-4 py-2.5 font-semibold">Superficie</th>
            <th className="px-4 py-2.5 font-semibold">Orientación</th>
            <th className="px-4 py-2.5 font-semibold">Estado</th>
            <th className="px-4 py-2.5 font-semibold">Precio</th>
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
    <tr className="border-b border-border-subtle last:border-0 hover:bg-background">
      <td className="px-4 py-2.5 tabular-nums">{unidad.codigo}</td>
      <td className="px-4 py-2.5">{config.singular}</td>
      <td className="px-4 py-2.5">{unidad.sector ?? "—"}</td>
      <td className="px-4 py-2.5">
        {formatSuperficie(unidad.superficieM2, config.superficieFormato)}
      </td>
      <td className="px-4 py-2.5">{unidad.orientacion ?? "—"}</td>
      <td className="px-4 py-2.5">
        <select
          defaultValue={unidad.estado}
          onChange={(e) => handleEstadoChange(e.target.value)}
          disabled={isPending}
          aria-label={`Estado de ${unidad.codigo}`}
          className="h-8 rounded-md border border-border-strong bg-surface px-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-soft disabled:opacity-60"
        >
          {STATUS_ORDER.map((estado) => (
            <option key={estado} value={estado}>
              {STATUS_LABELS[estado]}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={precio}
            onChange={(e) => setPrecio(Number(e.target.value))}
            onBlur={handlePrecioBlur}
            disabled={isPending}
            aria-label={`Precio de ${unidad.codigo} en ${unidad.moneda}`}
            className="w-32 h-8 rounded-md border border-border-strong bg-surface px-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-soft disabled:opacity-60"
          />
          <span className="text-xs text-foreground-muted">
            {formatPrecio(precio, unidad.moneda)}
          </span>
          {savedAt ? <span className="text-xs font-semibold text-primary">✓</span> : null}
        </div>
      </td>
    </tr>
  );
}
