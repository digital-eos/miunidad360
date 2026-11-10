"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  PROYECTO,
  ROOMS,
  UNIDAD,
  type Foto,
  type Room,
  type RoomId,
} from "@/lib/departamentos/cataluna-103";

const formatM2 = (value: number) =>
  `${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 }).format(value)} m²`;

/** A large photo with thumbnails under it. */
function Gallery({ fotos, sizes }: { fotos: Foto[]; sizes: string }) {
  const [index, setIndex] = useState(0);
  const current = fotos[Math.min(index, fotos.length - 1)];
  if (!current) return null;
  return (
    <div>
      <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-surface-muted">
        <Image src={current.src} alt={current.alt} fill sizes={sizes} className="object-cover" />
      </div>
      {fotos.length > 1 ? (
        <div className="mt-2 grid grid-cols-4 gap-2">
          {fotos.map((foto, i) => (
            <button
              key={foto.src}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Ver foto ${i + 1}: ${foto.alt}`}
              aria-pressed={i === index}
              className={cn(
                "relative aspect-[4/3] overflow-hidden rounded-md border-2 transition-colors duration-200",
                i === index ? "border-primary" : "border-transparent hover:border-border-subtle",
              )}
            >
              <Image src={foto.src} alt="" fill sizes="96px" className="object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Side view of the building with the unit's floor marked. */
function Ubicacion() {
  const floors = Array.from({ length: PROYECTO.pisos }, (_, i) => PROYECTO.pisos - i);
  return (
    <div className="flex items-end gap-4">
      <div className="flex w-24 flex-col gap-0.5" aria-hidden>
        {floors.map((f) => (
          <div
            key={f}
            className={cn(
              "flex h-4 items-center justify-center rounded-[3px] tabular-nums text-[9px]",
              f === UNIDAD.piso
                ? "bg-primary text-primary-foreground"
                : "bg-surface-muted text-foreground-muted",
            )}
          >
            {f === PROYECTO.pisos ? "Terraza" : f}
          </div>
        ))}
        <div className="flex h-4 items-center justify-center rounded-[3px] border border-border-subtle tabular-nums text-[9px] text-foreground-muted">
          PB
        </div>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-foreground-muted">Piso</dt>
        <dd>{UNIDAD.piso}</dd>
        <dt className="text-foreground-muted">Posición</dt>
        <dd>{UNIDAD.posicion}, al frente</dd>
        <dt className="text-foreground-muted">Vista</dt>
        <dd>{UNIDAD.frente}</dd>
      </dl>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="label-caps text-foreground-muted">
      {children}
    </p>
  );
}

function RoomDetail({ room, onBack }: { room: Room; onBack: () => void }) {
  return (
    <div className="px-5 py-5">
      <button
        type="button"
        onClick={onBack}
        className="text-sm text-foreground-muted transition-colors duration-200 hover:text-foreground"
      >
        ← Todo el departamento
      </button>
      <p className="mt-4 label-caps text-primary">
        Ambiente
      </p>
      <h2 className="mt-1 font-display text-3xl">{room.nombre}</h2>
      <p className="mt-1 text-sm text-foreground-muted">{room.medidas}</p>

      {room.fotos.length ? (
        <div className="mt-5">
          <Gallery key={room.id} fotos={room.fotos} sizes="(max-width: 1024px) 100vw, 400px" />
        </div>
      ) : null}

      <p className="mt-5 text-sm leading-relaxed">{room.descripcion}</p>
    </div>
  );
}

export function DepartamentoPanel({
  selectedRoom,
  onSelectRoom,
  onHoverRoom,
  className,
}: {
  selectedRoom: RoomId | null;
  onSelectRoom: (id: RoomId | null) => void;
  onHoverRoom: (id: RoomId | null) => void;
  className?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const room = ROOMS.find((r) => r.id === selectedRoom) ?? null;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [selectedRoom]);

  return (
    <div className={cn("flex flex-col overflow-hidden bg-background", className)}>
      <div className="border-b border-border-subtle px-5 py-4">
        <p className="label-caps text-primary">
          {PROYECTO.nombre}
          <span className="text-foreground-muted"> · {PROYECTO.direccion}</span>
        </p>
        <div className="mt-2 flex items-baseline justify-between gap-3">
          <h1 className="font-display text-2xl">Unidad {UNIDAD.codigo}</h1>
          <p className="text-sm text-foreground-muted">
            {UNIDAD.tipo} · Piso {UNIDAD.piso}
          </p>
        </div>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        {room ? (
          <RoomDetail room={room} onBack={() => onSelectRoom(null)} />
        ) : (
          <div className="space-y-8 px-5 py-5">
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                ["Interior", UNIDAD.superficieInterior],
                ["Balcón", UNIDAD.superficieBalcon],
                ["Total", UNIDAD.superficieInterior + UNIDAD.superficieBalcon],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-lg border border-border-subtle bg-surface-muted px-2 py-3"
                >
                  <p className="text-xs text-foreground-muted">{label}</p>
                  <p className="mt-0.5 font-display text-lg">{formatM2(value as number)}</p>
                </div>
              ))}
            </div>

            <div>
              <SectionTitle>Ambientes</SectionTitle>
              <ul className="mt-2 border-b border-border-subtle" onMouseLeave={() => onHoverRoom(null)}>
                {ROOMS.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => onSelectRoom(r.id)}
                      onMouseEnter={() => onHoverRoom(r.id)}
                      className="flex w-full items-center justify-between gap-3 border-t border-border-subtle py-2.5 text-left transition-colors duration-200 hover:bg-surface-muted"
                    >
                      <span className="text-sm font-medium">{r.nombre}</span>
                      <span className="flex items-center gap-3 text-xs text-foreground-muted">
                        {r.medidas}
                        {r.fotos.length ? (
                          <span className="rounded-md border border-border-subtle px-2 py-0.5">
                            {r.fotos.length} {r.fotos.length === 1 ? "foto" : "fotos"}
                          </span>
                        ) : null}
                        <span aria-hidden>→</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <SectionTitle>Plano</SectionTitle>
              <div className="mt-2 rounded-lg border border-border-subtle bg-surface-muted p-3">
                <Image
                  src={UNIDAD.plano}
                  alt={`Plano de la unidad ${UNIDAD.codigo}, con cotas`}
                  width={1091}
                  height={1987}
                  sizes="(max-width: 1024px) 60vw, 240px"
                  className="mx-auto h-auto w-3/5"
                />
              </div>
            </div>

            <div>
              <SectionTitle>Ubicación en el edificio</SectionTitle>
              <div className="mt-3">
                <Ubicacion />
              </div>
            </div>

            <div>
              <SectionTitle>Terminaciones</SectionTitle>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {PROYECTO.caracteristicas.map((c) => (
                  <span
                    key={c}
                    className="rounded-md border border-border-subtle px-3 py-1 text-xs text-foreground-muted"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <SectionTitle>El edificio</SectionTitle>
              <p className="mt-2 text-sm leading-relaxed">{PROYECTO.resumen}</p>
              <div className="mt-3">
                <Gallery fotos={PROYECTO.fotos} sizes="(max-width: 1024px) 100vw, 400px" />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {PROYECTO.amenities.map((a) => (
                  <span
                    key={a}
                    className="rounded-md bg-surface-muted px-3 py-1 text-xs text-foreground-muted"
                  >
                    {a}
                  </span>
                ))}
              </div>
            </div>

            <p className="text-xs leading-relaxed text-foreground-muted">
              Modelo 3D generado a partir del plano del folleto de venta de {PROYECTO.desarrollador}
              . Alturas y mobiliario aproximados; imágenes: renders del folleto.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
