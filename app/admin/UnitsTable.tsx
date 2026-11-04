"use client";

import { useState, useTransition } from "react";
import type { Unit } from "@/db/schema";
import { formatArea, formatUsdPrice } from "@/lib/units/format";
import { STATUS_LABELS, STATUS_ORDER } from "@/lib/units/status-colors";
import { updateUnitPrice, updateUnitStatus } from "./actions";

export function UnitsTable({ units }: { units: Unit[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border-subtle">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-border-subtle text-xs uppercase tracking-wide text-foreground-muted">
            <th className="px-4 py-3">Unidad</th>
            <th className="px-4 py-3">Piso</th>
            <th className="px-4 py-3">Ambientes</th>
            <th className="px-4 py-3">Superficie</th>
            <th className="px-4 py-3">Orientación</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Precio (USD)</th>
          </tr>
        </thead>
        <tbody>
          {units.map((unit) => (
            <UnitRow key={unit.id} unit={unit} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UnitRow({ unit }: { unit: Unit }) {
  const [isPending, startTransition] = useTransition();
  const [price, setPrice] = useState(unit.priceUsd);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const handleStatusChange = (status: string) => {
    startTransition(async () => {
      await updateUnitStatus(unit.id, status as Unit["status"]);
      setSavedAt(Date.now());
    });
  };

  const handlePriceBlur = () => {
    if (price === unit.priceUsd) return;
    startTransition(async () => {
      await updateUnitPrice(unit.id, price);
      setSavedAt(Date.now());
    });
  };

  return (
    <tr className="border-b border-border-subtle/60 last:border-0">
      <td className="px-4 py-3 font-mono">{unit.code}</td>
      <td className="px-4 py-3">{unit.floor}</td>
      <td className="px-4 py-3">
        {unit.rooms} amb · {unit.bedrooms} dorm
      </td>
      <td className="px-4 py-3">{formatArea(unit.areaM2)}</td>
      <td className="px-4 py-3">{unit.orientation}</td>
      <td className="px-4 py-3">
        <select
          defaultValue={unit.status}
          onChange={(e) => handleStatusChange(e.target.value)}
          disabled={isPending}
          className="rounded-md border border-border-subtle bg-background-elevated px-2 py-1 text-sm disabled:opacity-60"
        >
          {STATUS_ORDER.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            onBlur={handlePriceBlur}
            disabled={isPending}
            className="w-28 rounded-md border border-border-subtle bg-background-elevated px-2 py-1 text-sm disabled:opacity-60"
          />
          <span className="text-xs text-foreground-muted">{formatUsdPrice(price)}</span>
          {savedAt ? <span className="text-xs text-accent-strong">✓</span> : null}
        </div>
      </td>
    </tr>
  );
}
