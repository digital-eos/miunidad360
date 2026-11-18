"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { AnimatePresence, motion } from "motion/react";
import { CameraRig, type Viewpoint } from "@/components/three/CameraRig";
import { PostFX } from "@/components/three/visual/PostFX";
import { MapAttribution, MapGround, type MapBlend } from "@/components/three/geo/MapGround";
import { MapIntro } from "@/components/three/geo/MapIntro";
import { MapClouds } from "@/components/three/geo/MapClouds";
import { GeoSiteProvider } from "@/components/three/geo/site-context";
import { geoApiKey } from "@/lib/geo/config";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";
import { PLANTAS, superficie } from "@/lib/proyectos/casa-citra";
import {
  ALTURA_TOTAL,
  CALLES_URL,
  NIVELES,
  SITIO_GEO,
  SITIO_SOL,
  VISTA_INICIAL,
} from "@/lib/proyectos/casa-citra-3d";
import {
  buenosAiresDate,
  getSunPosition,
  solsticeDates,
  todayInBuenosAires,
  type CivilDate,
} from "@/lib/sun/sun-position";
import { CasaCitraModelo } from "./CasaCitraModelo";
import { CasaCitraEntorno, type Calles } from "./CasaCitraEntorno";

type CallesFile = { ways: { p: [number, number][] }[] };

/** OSM street file (meters east, north of the lot) → scene points (+X south, +Z west). */
async function cargarCalles(): Promise<Calles> {
  const res = await fetch(CALLES_URL);
  if (!res.ok) throw new Error("calles-" + res.status);
  const data = (await res.json()) as CallesFile;
  return data.ways.map((w) => w.p.map(([este, norte]) => [-norte, -este] as [number, number]));
}

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

/**
 * The shadow map is drawn only when something that casts or receives a shadow changed: the
 * sun, the cut, the wood growing during the descent. The scene is otherwise still (the camera
 * moving doesn't change shadows), so this saves the costliest pass on most frames.
 */
function modoSombras(gl: THREE.WebGLRenderer, automaticas: boolean) {
  gl.shadowMap.autoUpdate = automaticas;
  gl.shadowMap.needsUpdate = true;
}

type UltimoEstado = { corte: number; blend: number; sol: string };

/** Asks for a new shadow map when the cut, the descent or the sun moved since last frame. */
function revisarSombras(
  gl: THREE.WebGLRenderer,
  u: UltimoEstado,
  corte: number,
  blend: number,
  sol: string
) {
  if (u.corte === corte && u.blend === blend && u.sol === sol) return;
  u.corte = corte;
  u.blend = blend;
  u.sol = sol;
  gl.shadowMap.needsUpdate = true;
}

function SombrasEstaticas({
  plane,
  sol,
  blendRef,
}: {
  plane: THREE.Plane;
  sol: THREE.Vector3;
  blendRef: React.RefObject<MapBlend> | null;
}) {
  const get = useThree((s) => s.get);
  const ultimo = useRef<UltimoEstado>({ corte: NaN, blend: NaN, sol: "" });
  const solKey = sol.toArray().map((v) => v.toFixed(4)).join(",");
  useEffect(() => {
    modoSombras(get().gl, false);
    return () => modoSombras(get().gl, true);
  }, [get]);
  useFrame(({ gl }) =>
    revisarSombras(gl, ultimo.current, plane.constant, blendRef ? blendRef.current.value : 1, solKey)
  );
  return null;
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
  // From above the garden side, steep enough to see into every room over the cut walls.
  return { position: [-9 * d, base + 21 * d, 14 * d], target: [1.2, base, 0.6] };
}

export function CasaCitraExperience() {
  const isMobile = useIsMobile();
  // Same as Torre Aldrey: never above the screen's own density, never below 1 (under it the
  // lines turn soft and the image pixelates); on a slow GPU the effects go first.
  const screenDpr = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
  const maxDpr = Math.min(screenDpr, isMobile ? 1.5 : 2);
  const minDpr = Math.min(1, maxDpr);
  const [dpr, setDpr] = useState(maxDpr);
  /** 0 everything, 1 no ambient occlusion, 2 also no soft shadows and half the antialiasing. */
  const [efectos, setEfectos] = useState<0 | 1 | 2>(0);
  const [nivel, setNivel] = useState<number | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [estacion, setEstacion] = useState<Estacion>("verano");
  const [horaSol, setHoraSol] = useState(16);
  // Starts drawing at once; only stops once the section is known to be off screen.
  const [visible, setVisible] = useState(true);
  const frameRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  // Real location: Google's map under the house and the descent from the sky, like Torre
  // Aldrey. Without a key (or if the map fails) the sandy ground and no descent.
  const mapKey = geoApiKey();
  const [mapaFallo, setMapaFallo] = useState(false);
  const conMapa = Boolean(mapKey) && !mapaFallo;
  /** Tiles are only requested once the section gets near the screen. */
  const [cerca, setCerca] = useState(false);
  /** The descent starts the first time the section is really in view. */
  const [visto, setVisto] = useState(false);
  const [mapaListo, setMapaListo] = useState(false);
  const [introActiva, setIntroActiva] = useState(() => Boolean(mapKey));
  const [skipToken, setSkipToken] = useState(0);
  const [leyenda, setLeyenda] = useState<string | null>(null);
  const [atribucion, setAtribucion] = useState<string | null>(null);
  const [calles, setCalles] = useState<Calles | null>(null);
  // Reduced motion: no flight, straight to the plan with the wood standing.
  const blendRef = useRef<MapBlend>(
    reducedMotion ? { target: 1, value: 1 } : { target: 0, value: 0 }
  );
  const volando = conMapa && introActiva && !reducedMotion;

  const saltarIntro = useCallback(() => {
    if (volando) setSkipToken((t) => t + 1);
  }, [volando]);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const lejos = new IntersectionObserver(([e]) => e.isIntersecting && setCerca(true), { rootMargin: "800px" });
    const adentro = new IntersectionObserver(([e]) => e.isIntersecting && setVisto(true), { threshold: 0.5 });
    lejos.observe(el);
    adentro.observe(el);
    return () => {
      lejos.disconnect();
      adentro.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!conMapa || !cerca || calles) return;
    let cancel = false;
    cargarCalles()
      .then((c) => !cancel && setCalles(c))
      .catch(() => !cancel && setCalles([]));
    return () => {
      cancel = true;
    };
  }, [conMapa, cerca, calles]);

  const fallbackMapa = useCallback(() => {
    blendRef.current.target = blendRef.current.value = 1;
    setMapaFallo(true);
    setIntroActiva(false);
  }, []);

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
    saltarIntro();
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
      <div
        className="relative h-[70svh] min-h-[26rem] w-full lg:h-[78svh]"
        // Any drag or scroll on the view during the flight hands control to the visitor.
        onPointerDown={saltarIntro}
        onWheel={saltarIntro}
      >
        <Canvas
          shadows="percentage"
          dpr={dpr}
          frameloop={visible ? "always" : "never"}
          camera={{ fov: 35, near: 0.5, far: conMapa ? 3000 : 600, position: vista.position }}
          gl={{
            // Desktop renders through the effects composer, which antialiases itself: canvas
            // MSAA there would only cost memory. Mobile has no composer.
            antialias: isMobile,
            powerPreference: "high-performance",
            localClippingEnabled: true,
            toneMapping: THREE.ACESFilmicToneMapping,
          }}
          onPointerMissed={() => setSelected(null)}
        >
          <PerformanceMonitor
            bounds={() => [50, 58]}
            onDecline={() => {
              if (!isMobile && efectos < 2) setEfectos((e) => (e < 2 ? ((e + 1) as 1 | 2) : e));
              else setDpr((d) => Math.max(minDpr, d - 0.25));
            }}
            onIncline={() => setDpr((d) => Math.min(maxDpr, d + 0.25))}
          />
          <SombrasEstaticas plane={plane} sol={sol} blendRef={conMapa ? blendRef : null} />
          <Corte plane={plane} hasta={nivel === null ? SIN_CORTE : NIVELES[nivel].base + CORTE} />
          <CasaCitraEntorno
            sol={sol}
            isMobile={isMobile}
            sombrasSuaves={!isMobile && efectos < 2}
            blendRef={conMapa ? blendRef : null}
            calles={conMapa ? calles : null}
          />
          {conMapa && mapKey && cerca ? (
            <GeoSiteProvider site={SITIO_GEO}>
              <MapGround
                apiKey={mapKey}
                blendRef={blendRef}
                isMobile={isMobile}
                labels={false}
                buildingsCredit={null}
                onReady={() => setMapaListo(true)}
                onFallback={fallbackMapa}
                onAttribution={setAtribucion}
              />
              {volando ? (
                <>
                  <Suspense fallback={null}>
                    <MapClouds isMobile={isMobile} />
                  </Suspense>
                  <MapIntro
                    ready={mapaListo && visto}
                    endView={vista}
                    skipToken={skipToken}
                    onCaption={setLeyenda}
                    onComplete={() => {
                      setIntroActiva(false);
                      setLeyenda(null);
                    }}
                    blendRef={blendRef}
                  />
                </>
              ) : null}
            </GeoSiteProvider>
          ) : null}
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
          {volando ? null : (
          <CameraRig
            startFromCurrent={conMapa}
            pivotOnTarget
            target={vista}
            targetKey={`${nivel ?? "ext"}-${isMobile}`}
            autoRotateEnabled={nivel === null}
            autoRotateSpeed={0.35}
            minDistance={8}
            maxDistance={27}
          />
          )}
          {isMobile ? null : (
            <PostFX aoRadius={1.2} ssao={efectos < 1} multisampling={efectos >= 2 ? 2 : 4} />
          )}
        </Canvas>

        {conMapa && mapaListo ? <MapAttribution text={atribucion} /> : null}

        {/* The flight: where we are, and a way out. */}
        {volando && mapaListo && visto ? (
          <>
            <div className="pointer-events-none absolute inset-x-0 top-16 z-20 flex justify-center px-4 sm:top-6">
              {leyenda ? (
                <p key={leyenda} className="animate-caption-in rounded-md bg-surface px-4 py-1.5 label-caps text-foreground">
                  {leyenda}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={saltarIntro}
              className="absolute right-3 bottom-14 z-30 rounded-md border border-border-subtle bg-surface px-4 py-2 text-xs font-medium transition-colors hover:border-primary hover:text-primary sm:right-4"
            >
              Saltar vuelo →
            </button>
          </>
        ) : null}

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
