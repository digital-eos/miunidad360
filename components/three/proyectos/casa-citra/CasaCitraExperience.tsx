"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { AnimatePresence, motion } from "motion/react";
import { CameraRig, type Viewpoint } from "@/components/three/CameraRig";
import { PostFX } from "@/components/three/visual/PostFX";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";
import { cn } from "@/lib/utils";
import { PLANTAS, superficie } from "@/lib/proyectos/casa-citra";
import { ALTURA_TOTAL, NIVELES, SITIO_SOL, VISTA_INICIAL } from "@/lib/proyectos/casa-citra-3d";
import {
  buenosAiresDate,
  getSunPosition,
  solsticeDates,
  todayInBuenosAires,
  type CivilDate,
} from "@/lib/sun/sun-position";
import { CasaCitraModelo } from "./CasaCitraModelo";
import { CasaCitraEntorno } from "./CasaCitraEntorno";

/** Height above a level's floor where the house is cut to look inside. */
const CORTE = 1.3;
const SIN_CORTE = 1000;

type Estacion = "verano" | "equinoccio" | "invierno";
const ESTACIONES: { id: Estacion; nombre: string }[] = [
  { id: "verano", nombre: "Verano" },
  { id: "equinoccio", nombre: "Otoño / primavera" },
  { id: "invierno", nombre: "Invierno" },
];

const m2 = (n: number) =>
  `${n.toLocaleString("es-AR", { maximumFractionDigits: 1, minimumFractionDigits: 1 })} m²`;
const metros = (n: number) => n.toLocaleString("es-AR", { minimumFractionDigits: 2 });
const hora = (h: number) =>
  `${String(Math.floor(h)).padStart(2, "0")}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;

/**
 * Sun direction in the scene for a Buenos Aires local date and hour at the real lot.
 * Scene: +X south, +Z west (north is −X on the architect's sheets).
 */
function direccionSol(date: CivilDate, h: number) {
  const { altitude, azimuth } = getSunPosition(buenosAiresDate(date, h), SITIO_SOL.lat, SITIO_SOL.lon);
  // suncalc 1 convention: azimuth from south, positive toward west.
  return new THREE.Vector3(
    Math.cos(altitude) * Math.cos(azimuth),
    Math.sin(altitude),
    Math.cos(altitude) * Math.sin(azimuth)
  ).normalize();
}

/** One animation step of the cutting plane (a three.js object, mutated every frame). */
function moverCorte(plane: THREE.Plane, hasta: number, delta: number) {
  // Back to the exterior: the whole house at once.
  if (hasta === SIN_CORTE) {
    plane.constant = SIN_CORTE;
    return;
  }
  // Into a level: start the cut just over the roof, then slide down to it.
  if (plane.constant === SIN_CORTE) plane.constant = ALTURA_TOTAL + 0.5;
  plane.constant =
    Math.abs(plane.constant - hasta) < 0.005 ? hasta : THREE.MathUtils.damp(plane.constant, hasta, 6, delta);
}

/** Glides the cutting plane to its target height instead of snapping. */
function Corte({ plane, hasta }: { plane: THREE.Plane; hasta: number }) {
  useFrame((_, delta) => moverCorte(plane, hasta, delta));
  return null;
}

function vistaDeNivel(i: number | null, isMobile: boolean): Viewpoint {
  if (i === null) {
    const [x, y, z] = VISTA_INICIAL.position;
    const k = isMobile ? 1.35 : 1;
    return { position: [x * k, y * k, z * k], target: VISTA_INICIAL.target };
  }
  const base = NIVELES[i].base;
  const d = isMobile ? 1.4 : 1;
  return { position: [-7 * d, base + 15 * d, 10 * d], target: [0.6, base, 0.4] };
}

export function CasaCitraExperience() {
  const isMobile = useIsMobile();
  const [nivel, setNivel] = useState<number | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [estacion, setEstacion] = useState<Estacion>("verano");
  const [horaSol, setHoraSol] = useState(16);
  const [visible, setVisible] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);

  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), SIN_CORTE), []);
  const fecha = useMemo(() => solsticeDates(todayInBuenosAires().year)[estacion], [estacion]);
  const sol = useMemo(() => direccionSol(fecha, horaSol), [fecha, horaSol]);

  // Render only while the section is on screen: the page keeps scrolling smoothly elsewhere.
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "120px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const elegirNivel = (i: number | null) => {
    setNivel(i);
    setSelected(null);
    setHovered(null);
  };

  const planta = nivel === null ? null : PLANTAS[nivel];
  const ambiente = planta?.ambientes.find((a) => a.id === (selected ?? hovered)) ?? null;
  const vista = vistaDeNivel(nivel, isMobile);
  const solBajo = sol.y <= 0;

  return (
    <div ref={frameRef} className="overflow-hidden rounded-lg border border-border-subtle bg-surface">
      <div className="relative h-[70svh] min-h-[26rem] w-full lg:h-[78svh]">
        <Canvas
          shadows
          dpr={[1, isMobile ? 1.5 : 2]}
          frameloop={visible ? "always" : "never"}
          camera={{ fov: 35, near: 0.5, far: 600, position: vista.position }}
          gl={{ antialias: true, localClippingEnabled: true }}
          onCreated={({ gl }) => {
            gl.localClippingEnabled = true;
            gl.toneMapping = THREE.ACESFilmicToneMapping;
          }}
          onPointerMissed={() => setSelected(null)}
        >
          <Corte plane={plane} hasta={nivel === null ? SIN_CORTE : NIVELES[nivel].base + CORTE} />
          <CasaCitraEntorno sol={sol} isMobile={isMobile} />
          <CasaCitraModelo
            clipping={plane}
            nivelActivo={nivel}
            hoveredId={hovered}
            selectedId={selected}
            onPointerOver={(id) => {
              setHovered(id);
              document.body.style.cursor = "pointer";
            }}
            onPointerOut={(id) => {
              setHovered((h) => (h === id ? null : h));
              document.body.style.cursor = "";
            }}
            onSelect={setSelected}
            castShadow={!isMobile}
          />
          <CameraRig
            target={vista}
            targetKey={`${nivel ?? "ext"}-${isMobile}`}
            autoRotateEnabled={nivel === null}
            autoRotateSpeed={0.35}
            minDistance={8}
            maxDistance={60}
          />
          {isMobile ? null : <PostFX aoRadius={1.2} multisampling={4} />}
        </Canvas>

        {/* Levels */}
        <div
          role="tablist"
          aria-label="Vista"
          className="viewer-panel absolute top-3 left-3 flex flex-wrap gap-1 p-1 sm:top-4 sm:left-4"
        >
          {[{ i: null as number | null, nombre: "Exterior" }, ...NIVELES.map((n, i) => ({ i: i as number | null, nombre: n.nombre }))].map(
            ({ i, nombre }) => (
              <button
                key={nombre}
                type="button"
                role="tab"
                aria-selected={nivel === i}
                onClick={() => elegirNivel(i)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm",
                  nivel === i ? "bg-primary text-primary-foreground" : "text-foreground-muted hover:text-foreground"
                )}
              >
                {nombre}
              </button>
            )
          )}
        </div>

        {/* Room card */}
        <div className="pointer-events-none absolute top-16 right-3 left-3 sm:top-4 sm:left-auto sm:w-72">
          <AnimatePresence mode="wait">
            {planta ? (
              <motion.div
                key={ambiente?.id ?? `hint-${planta.id}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="viewer-panel pointer-events-auto p-4"
              >
                <p className="label-caps text-foreground-subtle">{planta.nombre}</p>
                {ambiente ? (
                  <>
                    <p className="mt-1 font-display text-xl leading-tight">{ambiente.nombre}</p>
                    {ambiente.medidas ? (
                      <p className="mt-1.5 text-sm tabular-nums text-foreground-muted">
                        {metros(ambiente.medidas[0])} × {metros(ambiente.medidas[1])} m ·{" "}
                        <span className="font-semibold text-foreground">≈ {m2(superficie(ambiente) ?? 0)}</span>
                      </p>
                    ) : null}
                    {ambiente.nota ? (
                      <p className="mt-1.5 text-sm leading-relaxed text-foreground-muted">{ambiente.nota}</p>
                    ) : null}
                  </>
                ) : (
                  <p className="mt-1 text-sm text-foreground-muted">
                    Tocá un ambiente para ver sus medidas.
                  </p>
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* Sun */}
        <div className="viewer-panel absolute right-3 bottom-3 left-3 p-3 sm:right-auto sm:bottom-4 sm:left-4 sm:w-[22rem]">
          <div className="flex items-center justify-between gap-2">
            <p className="label-caps text-foreground-subtle">Sol</p>
            <p className="text-xs tabular-nums text-foreground-muted">
              {hora(horaSol)} {solBajo ? "· de noche" : ""}
            </p>
          </div>
          <div className="mt-2 flex gap-1">
            {ESTACIONES.map((e) => (
              <button
                key={e.id}
                type="button"
                aria-pressed={estacion === e.id}
                onClick={() => setEstacion(e.id)}
                className={cn(
                  "flex-1 rounded-md border px-2 py-1 text-xs transition-colors",
                  estacion === e.id
                    ? "border-primary bg-primary-soft text-foreground"
                    : "border-border-subtle text-foreground-muted hover:text-foreground"
                )}
              >
                {e.nombre}
              </button>
            ))}
          </div>
          <input
            type="range"
            min={6}
            max={20.5}
            step={0.25}
            value={horaSol}
            onChange={(e) => setHoraSol(Number(e.target.value))}
            aria-label="Hora del día"
            className="mt-3 w-full accent-[var(--color-primary)]"
          />
        </div>
      </div>
    </div>
  );
}
