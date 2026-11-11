"use client";

import { useActionState, useId, useState, type ReactNode } from "react";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { submitUnitLead, type UnitLeadActionResult } from "@/app/actions/unit-lead";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TIPOS } from "@/lib/unidades/tipos";
import {
  formatCampo,
  formatPrecio,
  formatSuperficie,
  unidadReferencia,
  unidadResumen,
} from "@/lib/unidades/format";
import type { Unidad } from "@/lib/unidades/types";

const initialState: UnitLeadActionResult = { success: false };

const fieldClasses =
  "w-full rounded-lg border border-border-subtle bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-foreground-muted/60 focus:border-primary focus:outline-none";

export type FichaUnidadProps = {
  unidad: Unidad;
  proyectoSlug: string;
  proyectoNombre: string;
  /** Analytics / lead source, e.g. "lotes-unidad". */
  source: string;
  /** Header action: a "← label" back link when `backLabel` is set, a × button otherwise. */
  onClose?: () => void;
  backLabel?: string;
  /** Shown after the price and data list (a floor plan, a photo…). */
  media?: ReactNode;
  /** Shown after the data list (sun hours…). */
  children?: ReactNode;
  /** Footnote under the form. */
  nota?: string;
  /** Show the sector ("Piso 5") as the first entry of the data list instead of under the code. */
  sectorEnDatos?: boolean;
};

/**
 * The one "ficha de unidad" used by every demo: type + code, status, price, then the fields
 * defined for that unit type in lib/unidades/tipos.ts, a WhatsApp button with a pre-filled
 * message, a share link (?unidad=<código>) and a contact form.
 */
export function FichaUnidad({
  unidad,
  proyectoSlug,
  proyectoNombre,
  source,
  onClose,
  backLabel,
  media,
  children,
  nota = "Precios y estados ficticios, solo para esta demo.",
  sectorEnDatos = false,
}: FichaUnidadProps) {
  const config = TIPOS[unidad.tipo];
  const [state, formAction, isPending] = useActionState(submitUnitLead, initialState);
  const [copied, setCopied] = useState(false);
  const honeypotId = useId();

  const datos: { etiqueta: string; valor: string }[] = [];
  if (sectorEnDatos && unidad.sector) {
    // "Piso 5" reads as label "Piso", value "5" when the sector already starts with the label.
    const prefijo = `${config.sectorEtiqueta} `;
    datos.push({
      etiqueta: config.sectorEtiqueta,
      valor: unidad.sector.startsWith(prefijo)
        ? unidad.sector.slice(prefijo.length)
        : unidad.sector,
    });
  }
  datos.push({
    etiqueta: config.superficieEtiqueta,
    valor: formatSuperficie(unidad.superficieM2, config.superficieFormato),
  });
  if (unidad.superficieTerrenoM2 != null) {
    datos.push({
      etiqueta: config.terrenoEtiqueta ?? "Terreno",
      valor: formatSuperficie(unidad.superficieTerrenoM2, config.superficieFormato),
    });
  }
  if (unidad.orientacion) datos.push({ etiqueta: "Orientación", valor: unidad.orientacion });
  for (const campo of config.campos) {
    const valor = formatCampo(campo, unidad.atributos[campo.clave]);
    if (valor != null) datos.push({ etiqueta: campo.etiqueta, valor });
  }

  const whatsappMessage = `¡Hola! Me interesa ${unidadReferencia(unidad)} de ${proyectoNombre} (${unidadResumen(unidad)}). ¿Me pueden dar más información?`;

  const copyLink = async () => {
    const url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set("unidad", unidad.codigo);
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copiá este link:", url.toString());
    }
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-3 border-b border-border-subtle px-5 py-4">
        <div className="min-w-0">
          {onClose && backLabel ? (
            <button
              type="button"
              onClick={onClose}
              className="mb-3 text-xs font-medium text-foreground-muted transition-colors duration-200 hover:text-primary"
            >
              ← {backLabel}
            </button>
          ) : null}
          <p className="label-caps text-primary">
            {config.singular}
          </p>
          <h3 className="font-display text-2xl leading-tight">{unidad.codigo}</h3>
          {unidad.sector && !sectorEnDatos ? (
            <p className="mt-0.5 text-sm text-foreground-muted">{unidad.sector}</p>
          ) : null}
        </div>
        {onClose && !backLabel ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border-subtle text-lg transition-colors duration-200 hover:border-primary hover:text-primary"
          >
            ×
          </button>
        ) : null}
      </div>

      <div className="space-y-6 px-5 py-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-display text-2xl">{formatPrecio(unidad.precio, unidad.moneda)}</p>
            {unidad.precio != null ? (
              <p className="text-xs text-foreground-muted">Precio ilustrativo, no es una oferta real.</p>
            ) : null}
          </div>
          <StatusBadge status={unidad.estado} />
        </div>

        <dl className="grid grid-cols-2 gap-x-3 gap-y-3 text-sm">
          {datos.map((d) => (
            <div key={d.etiqueta}>
              <dt className="text-foreground-muted">{d.etiqueta}</dt>
              <dd>{d.valor}</dd>
            </div>
          ))}
        </dl>

        {media}

        {children}

        <div className="space-y-2">
          <WhatsAppButton
            source={source}
            label="Consultar por WhatsApp"
            message={whatsappMessage}
            className="w-full"
          />
          <button
            type="button"
            onClick={copyLink}
            className="btn btn-secondary w-full"
          >
            {copied ? "Link copiado ✓" : "Copiar link de esta unidad"}
          </button>
        </div>

        <div className="border-t border-border-subtle pt-5">
          {state.success ? (
            <div className="rounded-lg border border-primary/40 bg-primary-soft p-4">
              <p className="font-display text-lg">¡Gracias!</p>
              <p className="mt-1 text-sm text-foreground-muted">
                Recibimos tu consulta por {unidad.codigo}. Te vamos a contactar a la brevedad.
              </p>
            </div>
          ) : (
            <form action={formAction} className="space-y-3">
              <p className="text-sm font-medium">Quiero que me contacten</p>
              <input type="hidden" name="source" value={source} />
              <input type="hidden" name="projectSlug" value={proyectoSlug} />
              <input type="hidden" name="unitCode" value={unidad.codigo} />
              <div aria-hidden="true" className="absolute h-0 w-0 overflow-hidden opacity-0">
                <label htmlFor={honeypotId}>No completar este campo</label>
                <input
                  type="text"
                  id={honeypotId}
                  name="company_website"
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>

              <input name="name" placeholder="Nombre" aria-label="Nombre" required className={fieldClasses} />
              <input
                name="email"
                type="email"
                placeholder="Email"
                aria-label="Email"
                required
                className={fieldClasses}
              />
              <input
                name="phone"
                placeholder="Teléfono (opcional)"
                aria-label="Teléfono"
                className={fieldClasses}
              />

              {state.error ? (
                <p role="alert" className="text-sm text-danger">
                  {state.error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={isPending}
                className="btn btn-secondary w-full disabled:opacity-60"
              >
                {isPending ? "Enviando…" : "Quiero que me contacten"}
              </button>
            </form>
          )}
        </div>

        {nota ? <p className="text-center text-xs text-foreground-muted">{nota}</p> : null}
      </div>
    </div>
  );
}
