"use client";

import { useActionState } from "react";
import type { Unit } from "@/db/schema";
import { formatArea, formatUsdPrice } from "@/lib/units/format";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/units/status-colors";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { submitUnitLead, type UnitLeadActionResult } from "@/app/actions/unit-lead";
import { FloorPlanSvg } from "./FloorPlanSvg";

const initialState: UnitLeadActionResult = { success: false };

const fieldClasses =
  "w-full rounded-lg border border-border-subtle bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-foreground-muted/60 focus:border-accent focus:outline-none";

export function UnitPanel({
  unit,
  projectSlug,
  onClose,
  sunHoursVerano,
  sunHoursInvierno,
}: {
  unit: Unit;
  projectSlug: string;
  onClose: () => void;
  sunHoursVerano?: number | null;
  sunHoursInvierno?: number | null;
}) {
  const [state, formAction, isPending] = useActionState(submitUnitLead, initialState);
  const areaM2 = Number.parseFloat(unit.areaM2);
  const balconyM2 = Number.parseFloat(unit.balconyM2);

  const whatsappMessage = `¡Hola! Me interesa la unidad ${unit.code} del Edificio Demo (${unit.rooms} amb, ${formatArea(areaM2)}, ${formatUsdPrice(unit.priceUsd)}). ¿Me pueden dar más información?`;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-border-subtle bg-background sm:inset-y-0 sm:right-0 sm:left-auto sm:top-0 sm:h-full sm:max-h-none sm:w-full sm:max-w-md sm:rounded-none sm:border-l sm:border-t-0">
      <div className="sticky top-0 flex items-center justify-between border-b border-border-subtle bg-background px-5 py-4">
        <div>
          <p className="font-mono text-xs text-foreground-muted">{unit.code}</p>
          <h2 className="font-display text-xl">Piso {unit.floor}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border-subtle text-lg transition-colors duration-200 hover:border-accent hover:text-accent"
        >
          ×
        </button>
      </div>

      <div className="space-y-6 px-5 py-5">
        <div className="rounded-xl border border-border-subtle bg-background-elevated p-3">
          <FloorPlanSvg
            bedrooms={unit.bedrooms}
            areaM2={areaM2}
            balconyM2={balconyM2}
            className="w-full"
          />
        </div>

        <div className="flex items-center justify-between">
          <p className="font-display text-2xl">{formatUsdPrice(unit.priceUsd)}</p>
          <span
            className="rounded-full px-3 py-1 text-xs font-medium"
            style={{
              backgroundColor: `${STATUS_COLORS[unit.status]}26`,
              color: STATUS_COLORS[unit.status],
            }}
          >
            {STATUS_LABELS[unit.status]}
          </span>
        </div>

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-foreground-muted">Ambientes</dt>
            <dd>{unit.rooms} amb · {unit.bedrooms} dorm</dd>
          </div>
          <div>
            <dt className="text-foreground-muted">Superficie</dt>
            <dd>
              {formatArea(areaM2)} cub. + {formatArea(balconyM2)} balcón
            </dd>
          </div>
          <div>
            <dt className="text-foreground-muted">Orientación</dt>
            <dd>{unit.orientation}</dd>
          </div>
          <div>
            <dt className="text-foreground-muted">Tipología</dt>
            <dd>Tipo {unit.planType}</dd>
          </div>
        </dl>

        {sunHoursVerano != null || sunHoursInvierno != null ? (
          <div className="rounded-xl border border-border-subtle bg-background-elevated p-3">
            <p className="text-xs font-medium text-foreground-muted">Sol directo en la fachada</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-foreground-muted">Verano</p>
                <p>{sunHoursVerano != null ? `${sunHoursVerano.toFixed(1)} h` : "calculando…"}</p>
              </div>
              <div>
                <p className="text-xs text-foreground-muted">Invierno</p>
                <p>{sunHoursInvierno != null ? `${sunHoursInvierno.toFixed(1)} h` : "calculando…"}</p>
              </div>
            </div>
          </div>
        ) : null}

        <WhatsAppButton
          source="selector-unidad"
          label="Consultar por WhatsApp"
          message={whatsappMessage}
          className="w-full"
        />

        <div className="border-t border-border-subtle pt-5">
          {state.success ? (
            <div className="rounded-xl border border-accent/40 bg-accent-soft p-4">
              <p className="font-display text-lg">¡Gracias!</p>
              <p className="mt-1 text-sm text-foreground-muted">
                Recibimos tu consulta por {unit.code}. Te vamos a contactar a la brevedad.
              </p>
            </div>
          ) : (
            <form action={formAction} className="space-y-3">
              <p className="text-sm font-medium">Quiero que me contacten</p>
              <input type="hidden" name="source" value="selector-unidad" />
              <input type="hidden" name="projectSlug" value={projectSlug} />
              <input type="hidden" name="unitCode" value={unit.code} />
              <div aria-hidden="true" className="absolute h-0 w-0 overflow-hidden opacity-0">
                <label htmlFor="unit-company-website">No completar este campo</label>
                <input
                  type="text"
                  id="unit-company-website"
                  name="company_website"
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>

              <input name="name" placeholder="Nombre" required className={fieldClasses} />
              <input
                name="email"
                type="email"
                placeholder="Email"
                required
                className={fieldClasses}
              />
              <input name="phone" placeholder="Teléfono (opcional)" className={fieldClasses} />

              {state.error ? (
                <p role="alert" className="text-sm text-red-400">
                  {state.error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={isPending}
                className="w-full rounded-full border border-border-subtle py-2.5 text-sm font-medium transition-colors duration-200 hover:border-accent hover:text-accent disabled:opacity-60"
              >
                {isPending ? "Enviando…" : "Quiero que me contacten"}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-foreground-muted">
          Edificio Demo es un proyecto ficticio, creado solo para esta demo.
        </p>
      </div>
    </div>
  );
}
