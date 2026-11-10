"use client";

import { useEffect, useState } from "react";
import { fetchUnidades } from "@/lib/unidades/fetch";
import { formatPrecio } from "@/lib/unidades/format";
import type { Unidad } from "@/lib/unidades/types";
import { CATALUNA_CONFIG, CATALUNA_SLUG } from "@/lib/three/cataluna-ii";
import { SITE } from "@/lib/geo/site";
import { ListingHeader } from "./ListingHeader";

/**
 * Cataluña II's listing header. Prices and availability come from the same units endpoint
 * as the 3D view, so the header always matches what the card shows.
 */
export function CatalunaListingHeader() {
  const [units, setUnits] = useState<Unidad[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchUnidades(CATALUNA_SLUG)
      .then((data) => {
        if (!cancelled) setUnits(data.unidades);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const available = units?.filter((u) => u.estado === "disponible") ?? null;
  const prices = available?.flatMap((u) => (u.precio != null ? [u.precio] : [])) ?? [];
  const moneda = available?.find((u) => u.precio != null)?.moneda ?? "USD";

  return (
    <ListingHeader
      eyebrow="Departamentos en venta"
      title={SITE.name}
      location="A 800 m del mar"
      priceLabel={prices.length ? formatPrecio(Math.min(...prices), moneda) : null}
      description="15 unidades funcionales de 1, 2 y 3 ambientes, con quincho, terraza con solárium, parrilla y huerta comunitaria."
      stats={[
        { label: "Unidades", value: units ? String(units.length) : "—" },
        { label: "Disponibles", value: available ? String(available.length) : "—" },
        { label: "Pisos", value: String(CATALUNA_CONFIG.floors) },
        { label: "Ambientes", value: "1 a 3" },
      ]}
    />
  );
}
