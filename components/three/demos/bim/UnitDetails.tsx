"use client";

import { useActionState } from "react";
import type { BimUnit } from "@/lib/bim/dataset";
import { formatArea, formatUsdPrice } from "@/lib/units/format";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/units/status-colors";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { submitUnitLead, type UnitLeadActionResult } from "@/app/actions/unit-lead";

const initialState: UnitLeadActionResult = { success: false };

const fieldClasses =
  "w-full rounded-lg border border-border-subtle bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-foreground-muted/60 focus:border-accent focus:outline-none";

/** One unit's data and enquiry form, shown inside the info card beside the 3D view. */
export function UnitDetails({
  unit,
  onBack,
  backLabel,
}: {
  unit: BimUnit;
  onBack: () => void;
  backLabel: string;
}) {
  const [state, formAction, isPending] = useActionState(submitUnitLead, initialState);

  const whatsappMessage = `¡Hola! Me interesa la unidad ${unit.name} (${unit.storey}, ${unit.bedrooms} dorm, ${formatArea(unit.area_m2)}). ¿Me pueden dar más información?`;

  return (
    <div>
      <div className="border-b border-border-subtle px-5 py-4">
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-medium text-foreground-muted transition-colors duration-200 hover:text-accent-strong"
        >
          ← {backLabel}
        </button>
        <p className="mt-3 font-mono text-xs text-foreground-muted">{unit.name}</p>
        <h3 className="font-display text-xl">{unit.storey}</h3>
      </div>

      <div className="space-y-6 px-5 py-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-display text-2xl">{formatUsdPrice(unit.priceUsd)}</p>
            <p className="text-xs text-foreground-muted">
              Precio ilustrativo, no es una oferta real.
            </p>
          </div>
          <span
            className="shrink-0 rounded-full px-3 py-1 text-xs font-medium"
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
            <dd>
              {unit.rooms} amb · {unit.bedrooms} dorm
            </dd>
          </div>
          <div>
            <dt className="text-foreground-muted">Superficie</dt>
            <dd>{formatArea(unit.area_m2)}</dd>
          </div>
          <div>
            <dt className="text-foreground-muted">Piso</dt>
            <dd>{unit.storey}</dd>
          </div>
          <div>
            <dt className="text-foreground-muted">Unidad</dt>
            <dd>{unit.name}</dd>
          </div>
        </dl>

        <WhatsAppButton
          source="bim-unidad"
          label="Consultar por WhatsApp"
          message={whatsappMessage}
          className="w-full"
        />

        <div className="border-t border-border-subtle pt-5">
          {state.success ? (
            <div className="rounded-xl border border-accent/40 bg-accent-soft p-4">
              <p className="font-display text-lg">¡Gracias!</p>
              <p className="mt-1 text-sm text-foreground-muted">
                Recibimos tu consulta por {unit.name}. Te vamos a contactar a la brevedad.
              </p>
            </div>
          ) : (
            <form action={formAction} className="space-y-3">
              <p className="text-sm font-medium">Quiero que me contacten</p>
              <input type="hidden" name="source" value="bim-unidad" />
              <input type="hidden" name="projectSlug" value="bim-demo" />
              <input type="hidden" name="unitCode" value={unit.name} />
              <div
                aria-hidden="true"
                className="absolute h-0 w-0 overflow-hidden opacity-0"
              >
                <label htmlFor="bim-unit-company-website">No completar este campo</label>
                <input
                  type="text"
                  id="bim-unit-company-website"
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
              <input
                name="phone"
                placeholder="Teléfono (opcional)"
                className={fieldClasses}
              />

              {state.error ? (
                <p role="alert" className="text-sm text-red-400">
                  {state.error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={isPending}
                className="w-full rounded-full border border-border-subtle py-2.5 text-sm font-medium transition-colors duration-200 hover:border-accent hover:text-accent-strong disabled:opacity-60"
              >
                {isPending ? "Enviando…" : "Quiero que me contacten"}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-foreground-muted">
          Precios y estados de las unidades son ficticios, solo para esta demo.
        </p>
      </div>
    </div>
  );
}
