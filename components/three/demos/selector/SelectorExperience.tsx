"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Canvas } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import { cn } from "@/lib/utils";
import type { Project } from "@/db/schema";
import { useCaptureMode } from "@/lib/hooks/use-capture-mode";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { fetchUnidades } from "@/lib/unidades/fetch";
import { attrNumber, findUnidad, type Unidad } from "@/lib/unidades/types";
import { generateFloorPlan } from "@/lib/units/floor-plan";
import { totalBuildingHeight } from "@/lib/three/building-config";
import { generateApartmentLayout } from "@/lib/three/building-layout";
import { CATALUNA_CONFIG } from "@/lib/three/cataluna-ii";
import type { Viewpoint } from "@/components/three/CameraRig";
import { EMPTY_FILTERS, unitMatchesFilters, type UnitFilters } from "@/lib/units/filters";
import { STATUS_COLORS } from "@/lib/units/status-colors";
import { civilDateKey, solsticeDates, todayInBuenosAires } from "@/lib/sun/sun-position";
import { useSunHours } from "@/lib/sun/use-sun-hours";
import { trackFilterUsed, trackUnitOpened } from "@/lib/analytics";
import { SITE } from "@/lib/geo/site";

// Shown name and address. The database row (edificio-demo) keeps its old demo values.
const PROJECT_NAME = "Cataluña II";
const PROJECT_ADDRESS = `${SITE.address}, ${SITE.city}`;
import { GEO_PREVIEW_KEY, geoApiKey, geoPreviewAllowed, supportsGeo } from "@/lib/geo/config";
import type { FlyoverCaption } from "@/components/three/geo/AerialFlyover";
import { MapAttribution } from "@/components/three/geo/MapGround";
import { SelectorScene, type SelectorGeoOptions, type SelectorMapOptions } from "./SelectorScene";
import { FloorSelector } from "./FloorSelector";
import { UnitPin } from "./UnitPin";
import { EdificioInfoPanel } from "./EdificioInfoPanel";

const loadDepartamento = () =>
  import("../departamento/DepartamentoExperience").then((mod) => mod.DepartamentoExperience);

/** The apartment interior opened by a card's "Ver"; loaded only when needed. */
const DepartamentoExperience = dynamic(loadDepartamento, {
  ssr: false,
  loading: () => <div className="h-[100svh] w-full bg-background" />,
});

/** Length of the fade between the building and the apartment. */
const FADE_MS = 400;

const config = CATALUNA_CONFIG;
const layoutById = new Map(generateApartmentLayout(config).map((apt) => [apt.id, apt]));

/** Interior renders shown in the pinned card, picked by the unit's room count. */
const PHOTOS_BY_TYPE = {
  dosAmbientes: [
    "/projects/edificio-demo/fotos/dos-ambientes-1.webp",
    "/projects/edificio-demo/fotos/dos-ambientes-2.webp",
  ],
  tresAmbientes: [
    "/projects/edificio-demo/fotos/tres-ambientes-1.webp",
    "/projects/edificio-demo/fotos/tres-ambientes-2.webp",
  ],
};

function unitPhotos(unit: Unidad): string[] {
  const rooms = attrNumber(unit, "ambientes") ?? 2;
  return rooms <= 2 ? PHOTOS_BY_TYPE.dosAmbientes : PHOTOS_BY_TYPE.tresAmbientes;
}

function floorCenterY(floor: number): number {
  return config.groundFloorHeight + (floor - 0.5) * config.floorHeight;
}

/**
 * Whole-tower shot. On the real map it is the view the entrance descent ends on: closer than
 * the plain shot, so the tower fills most of the frame with the street at its foot.
 */
function overviewViewpoint(aspect: number, city = false): Viewpoint {
  const height = totalBuildingHeight(config);
  // Narrow (portrait) views step back so the whole tower fits.
  const back = (aspect < 1 ? 2.3 : 1.7) * (city ? 0.6 : 1);
  return {
    position: [
      config.buildingWidth * 1.15 * back,
      height * 0.95 * back,
      config.buildingDepth * 2.1 * back,
    ],
    // Up close, aim a little lower so the entrance stays in the frame.
    target: [0, height * (city ? 0.42 : 0.48), 0],
  };
}

/**
 * Straight-on street elevation, close to the brochure render (page 1 of the PDF): eye about a
 * third of the way up, the whole front in view. Opened with ?vista=frente for comparisons.
 */
function frontViewpoint(aspect: number): Viewpoint {
  const height = totalBuildingHeight(config);
  const distance = aspect < 1 ? 78 : 46;
  return {
    position: [0, height * 0.42, config.buildingDepth / 2 + distance],
    target: [0, height * 0.47, config.buildingDepth / 2],
  };
}

function floorViewpoint(floor: number): Viewpoint {
  const y = floorCenterY(floor);
  return {
    position: [config.buildingWidth * 1.45, y + config.floorHeight * 7, config.buildingDepth * 2.45],
    target: [0, y, 0],
  };
}

/**
 * Looks down into a unit from its own corner, steep enough to see its open plan over the
 * cut walls. The camera aims above the unit so it sits in the lower part of the view,
 * leaving room for its card on top.
 */
function unitViewpoint(unit: Unidad): Viewpoint {
  const y = floorCenterY(unitFloor(unit));
  const apt = layoutById.get(meshId(unit));
  if (!apt) return floorViewpoint(unitFloor(unit));
  const [x, , z] = apt.position;
  // From the unit's own facade (street or rear), off to its side of the building.
  const sz = z >= 0 ? 1 : -1;
  const sx = x > 0.5 ? 1 : x < -0.5 ? -1 : 0.5;
  return {
    position: [sx * config.buildingWidth * 1.6, y + config.floorHeight * 6, z + sz * config.buildingDepth * 0.95],
    target: [x * 0.6, y + config.floorHeight * 1.2, z],
  };
}

type FetchState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; project: Project; units: Unidad[] };

/** 3D id of an apartment in the procedural building ("P04-B"). */
function meshId(unit: Unidad): string {
  return unit.objeto3d ?? unit.codigo;
}

/** Only units on sale react in the 3D view: sold or reserved ones show nothing. */
function isForSale(unit: Unidad): boolean {
  return unit.estado === "disponible";
}

function unitFloor(unit: Unidad): number {
  return attrNumber(unit, "piso") ?? 1;
}

export function SelectorExperience({
  projectSlug,
  embedded = false,
  children,
}: {
  projectSlug: string;
  /**
   * Inside another page (the homepage's "El resultado" frame): framed layout, the URL is
   * left alone and the capture mode is off.
   */
  embedded?: boolean;
  /** Overlays drawn on the 3D view (back link, scroll cue). */
  children?: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const prefersReducedMotion = usePrefersReducedMotion();
  const captureMode = useCaptureMode();
  const capturing = captureMode.active && !embedded;
  // Never render above the screen's own density: a fixed 2 on a 1× monitor drew 4× the
  // pixels (≈80 ms vs ≈43 ms a frame on an integrated GPU) for edges MSAA already smooths.
  const screenDpr = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
  const maxDpr = Math.min(screenDpr, isMobile ? 1.5 : 2);
  // The adaptive resolution never drops below 1: under it the facade lines turn soft.
  const minDpr = Math.min(1, maxDpr);
  const [dpr, setDpr] = useState(maxDpr);
  const stageRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [aspect, setAspect] = useState(1.6);

  const [state, setState] = useState<FetchState>({ status: "loading" });
  const [filters, setFilters] = useState<UnitFilters>(EMPTY_FILTERS);
  const [focusFloor, setFocusFloor] = useState<number | null>(null);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  /** 3D id of the for-sale unit under the pointer; its card shows only while hovered. */
  const [hovered, setHovered] = useState<string | null>(null);
  const [listHover, setListHover] = useState<string | null>(null);
  const [sceneReady, setSceneReady] = useState(false);
  /** Building view, or the sample apartment interior opened from a card. */
  const [vista, setVista] = useState<"edificio" | "departamento">("edificio");
  const [fading, setFading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unitsRef = useRef<Unidad[]>([]);

  // Real location (Google 3D tiles + aerial intro). Off when embedded, capturing, without an
  // API key, with ?geo=0, or after the tiles failed (then the classic city comes back).
  const [geoFailed, setGeoFailed] = useState(false);
  const geoKey =
    geoPreviewAllowed() && searchParams.get("geo") === "preview" ? GEO_PREVIEW_KEY : geoApiKey();
  // Google's 3D mesh of Mar del Plata is outdated: the default is a flat street map under the
  // tower (2D tiles, same key). The 3D city stays behind ?geo=3d (and ?geo=preview in dev).
  const geoParam = searchParams.get("geo");
  const realLocationAllowed = !embedded && !capturing && geoParam !== "0";
  const geoEnabled =
    realLocationAllowed &&
    !geoFailed &&
    geoKey != null &&
    (geoParam === "3d" || geoKey === GEO_PREVIEW_KEY) &&
    supportsGeo();
  const [mapFailed, setMapFailed] = useState(false);
  const [mapAttribution, setMapAttribution] = useState<string | null>(null);
  const mapKey = geoApiKey();
  const mapEnabled = realLocationAllowed && !geoEnabled && !mapFailed && mapKey != null;
  const realLocation = geoEnabled || mapEnabled;
  // Skip the flight for deep links to a unit and for reduced motion.
  const [introActive, setIntroActive] = useState(
    () => !prefersReducedMotion && !searchParams.get("unidad"),
  );
  const [skipToken, setSkipToken] = useState(0);
  const [caption, setCaption] = useState<FlyoverCaption | null>(null);
  const flying = realLocation && introActive;
  const flyingRef = useRef(flying);
  useEffect(() => {
    flyingRef.current = flying;
  }, [flying]);
  const skipIntro = useCallback(() => {
    if (flyingRef.current) setSkipToken((t) => t + 1);
  }, []);
  // The reduced-motion preference resolves after mount: cut the flight if it's set.
  useEffect(() => {
    if (prefersReducedMotion) skipIntro();
  }, [prefersReducedMotion, skipIntro]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setAspect(width / height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchUnidades(projectSlug)
      .then((data) => {
        if (cancelled) return;
        setState({ status: "ready", project: data.project, units: data.unidades });

        const unit = embedded ? null : findUnidad(data.unidades, searchParams.get("unidad"));
        if (unit && isForSale(unit)) {
          setSelectedCode(unit.codigo);
          setFocusFloor(unitFloor(unit));
        }
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectSlug]);

  const updateUrl = useCallback(
    (code: string | null) => {
      if (embedded) return;
      const params = new URLSearchParams(searchParams.toString());
      if (code) params.set("unidad", code);
      else params.delete("unidad");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [embedded, pathname, router, searchParams],
  );

  const handleSelectUnit = useCallback(
    (code: string | null) => {
      const unit = code ? unitsRef.current.find((u) => u.codigo === code) : null;
      if (unit && !isForSale(unit)) return;
      skipIntro();
      setSelectedCode(code);
      updateUrl(code);
      if (!code) return;
      if (unit) setFocusFloor(unitFloor(unit));
      trackUnitOpened("selector", code);
    },
    [updateUrl, skipIntro],
  );

  const handleSelectFloor = useCallback(
    (floor: number | null) => {
      skipIntro();
      setFocusFloor(floor);
      const current = unitsRef.current.find((u) => u.codigo === selectedCode);
      if (current && floor !== unitFloor(current)) handleSelectUnit(null);
    },
    [selectedCode, handleSelectUnit, skipIntro],
  );

  const handleFiltersChange = useCallback((next: UnitFilters) => {
    setFilters(next);
    trackFilterUsed("selector");
  }, []);

  const handleApartmentClick = useCallback(
    (id: string) => {
      const unit = unitsRef.current.find((u) => meshId(u) === id);
      if (!unit || !isForSale(unit)) return;
      handleSelectUnit(unit.codigo);
    },
    [handleSelectUnit],
  );

  const handleApartmentPointerOver = useCallback((code: string) => {
    const unit = unitsRef.current.find((u) => meshId(u) === code);
    if (!unit || !isForSale(unit)) {
      setHovered(null);
      return;
    }
    setHovered(code);
  }, []);

  const handleApartmentPointerOut = useCallback(() => {
    setHovered(null);
  }, []);

  // Fade out, swap the view while the screen is blank, fade back in. Same page, no redirect.
  const switchVista = useCallback((next: "edificio" | "departamento") => {
    if (fadeTimer.current) clearTimeout(fadeTimer.current);
    setFading(true);
    fadeTimer.current = setTimeout(() => {
      setVista(next);
      setHovered(null);
      // The building canvas mounts again: show its loader until it has drawn.
      if (next === "edificio") setSceneReady(false);
      const top = wrapperRef.current?.getBoundingClientRect().top ?? 0;
      if (top < 0) wrapperRef.current?.scrollIntoView({ block: "start" });
      requestAnimationFrame(() => setFading(false));
    }, FADE_MS);
  }, []);

  useEffect(
    () => () => {
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
    },
    [],
  );

  const units = useMemo(() => (state.status === "ready" ? state.units : []), [state]);
  useEffect(() => {
    unitsRef.current = units;
  }, [units]);

  // Scripted capture sequence: colored overview, isolate a floor, open a unit card.
  const captureCycleRef = useRef(0);
  useEffect(() => {
    if (!capturing || state.status !== "ready" || units.length === 0) return;

    const floor = Math.ceil(config.floors / 2);
    const targetUnit = units.find((u) => unitFloor(u) === floor && isForSale(u)) ?? null;

    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const cycleId = ++captureCycleRef.current;

    function runCycle() {
      if (cancelled || captureCycleRef.current !== cycleId) return;
      handleSelectUnit(null);
      setFocusFloor(null);
      timers.push(
        setTimeout(() => {
          if (!cancelled) setFocusFloor(floor);
        }, 4000),
      );
      timers.push(
        setTimeout(() => {
          if (!cancelled && targetUnit) handleSelectUnit(targetUnit.codigo);
        }, 8000),
      );
      timers.push(setTimeout(runCycle, 13000));
    }

    runCycle();
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capturing, state.status, units]);

  const lat = state.status === "ready" ? (state.project.latitude ?? -34.5755) : -34.5755;
  const lng = state.status === "ready" ? (state.project.longitude ?? -58.4338) : -58.4338;
  const { cache: sunHoursCache, requestDate } = useSunHours(
    realLocation ? SITE.lat : lat,
    realLocation ? SITE.lon : lng,
    realLocation ? SITE.facadeBearing : undefined,
  );
  const { verano, invierno } = useMemo(() => solsticeDates(todayInBuenosAires().year), []);

  useEffect(() => {
    if (state.status !== "ready") return;
    requestDate(verano);
    requestDate(invierno);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status, verano, invierno]);

  const apartmentColors = useMemo(() => {
    const colors: Record<string, string> = {};
    for (const unit of units) colors[meshId(unit)] = STATUS_COLORS[unit.estado];
    return colors;
  }, [units]);

  const dimmedIds = useMemo(
    () => new Set(units.filter((u) => !unitMatchesFilters(u, filters)).map(meshId)),
    [units, filters],
  );

  const orientations = useMemo(
    () =>
      Array.from(
        new Set(units.map((u) => u.orientacion).filter((o): o is string => Boolean(o))),
      ).sort(),
    [units],
  );

  const selectedUnit = useMemo(
    () => units.find((u) => u.codigo === selectedCode) ?? null,
    [units, selectedCode],
  );
  // Same plan as the panel's 2D plan: the selected unit opens up in the tower with these rooms.
  const selectedPlan = useMemo(
    () =>
      selectedUnit
        ? generateFloorPlan({
            bedrooms: attrNumber(selectedUnit, "dormitorios") ?? 1,
            areaM2: selectedUnit.superficieM2,
            balconyM2: attrNumber(selectedUnit, "balcon_m2") ?? 0,
          })
        : null,
    [selectedUnit],
  );

  // A pinned card offers "Ver": load the apartment view ahead so the switch is instant.
  useEffect(() => {
    if (selectedUnit && !embedded) void loadDepartamento();
  }, [selectedUnit, embedded]);

  // Hover card for the unit under the pointer; the pinned unit already has its own card.
  const previewUnit = useMemo(() => {
    const unit = hovered ? (units.find((u) => meshId(u) === hovered) ?? null) : null;
    return unit && unit !== selectedUnit ? unit : null;
  }, [units, hovered, selectedUnit]);

  const pins = useMemo(
    () => [{ id: previewUnit ? meshId(previewUnit) : null, ref: previewRef }],
    [previewUnit],
  );

  const listHoverMeshId = useMemo(() => {
    const unit = listHover ? units.find((u) => u.codigo === listHover) : null;
    return unit && isForSale(unit) ? meshId(unit) : null;
  }, [units, listHover]);

  const handleIntroDone = useCallback(() => {
    setIntroActive(false);
    setCaption(null);
  }, []);
  const handleGeoFallback = useCallback((reason: string) => {
    console.warn("[selector] Google 3D tiles unavailable, using the classic scene:", reason);
    setGeoFailed(true);
    setSceneReady(false);
    setCaption(null);
  }, []);
  const handleMapFallback = useCallback((reason: string) => {
    console.warn("[selector] Google map tiles unavailable, using the classic scene:", reason);
    setMapFailed(true);
    setSceneReady(false);
  }, []);
  const frontal = !embedded && searchParams.get("vista") === "frente";
  const overview = useMemo(
    () => (frontal ? frontViewpoint(aspect) : overviewViewpoint(aspect, mapEnabled)),
    [frontal, aspect, mapEnabled],
  );
  const map = useMemo<SelectorMapOptions | null>(
    () =>
      mapEnabled && mapKey
        ? {
            apiKey: mapKey,
            onFallback: handleMapFallback,
            onAttribution: setMapAttribution,
            introActive,
            endView: overview,
            skipToken,
            onCaption: setCaption,
            onIntroDone: handleIntroDone,
          }
        : null,
    [mapEnabled, mapKey, handleMapFallback, introActive, overview, skipToken, handleIntroDone],
  );
  const geo = useMemo<SelectorGeoOptions | null>(
    () =>
      geoEnabled && geoKey
        ? {
            apiKey: geoKey,
            intro: introActive,
            introActive,
            endView: overview,
            skipToken,
            onCaption: setCaption,
            onIntroDone: handleIntroDone,
            onFallback: handleGeoFallback,
          }
        : null,
    // The flight's landing shot is fixed when it starts; a resize mid-flight doesn't move it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [geoEnabled, geoKey, introActive, skipToken, handleIntroDone, handleGeoFallback],
  );

  const cameraTarget = selectedUnit
    ? unitViewpoint(selectedUnit)
    : focusFloor != null
      ? floorViewpoint(focusFloor)
      : overview;
  const cameraTargetKey = selectedUnit
    ? `unit-${selectedUnit.codigo}`
    : focusFloor != null
      ? `floor-${focusFloor}`
      : `overview-${aspect < 1 ? "narrow" : "wide"}`;

  if (state.status === "error") {
    return (
      <div className="flex h-[100svh] w-full flex-col items-center justify-center gap-3 bg-background bg-grid px-6 text-center">
        <p className="font-display text-2xl">No pudimos cargar las unidades</p>
        <p className="max-w-sm text-sm text-foreground-muted">
          Probá recargar la página en unos segundos.
        </p>
      </div>
    );
  }

  const ready = state.status === "ready";
  const span = Math.max(config.buildingWidth, config.buildingDepth);

  const stage = (
    <div
      ref={stageRef}
      className={cn("relative h-full w-full", hovered ? "cursor-pointer" : "")}
      // Grabbing the view during the flight hands control over right away.
      onPointerDown={skipIntro}
      onWheel={skipIntro}
    >
      <Canvas
        key={geo ? "geo" : map ? "map" : "classic"}
        camera={{
          position: overview.position,
          fov: 40,
          near: 0.5,
          far: geo ? 8000 : map ? 2000 : 600,
        }}
        dpr={dpr}
        // PCF: three r187 removed PCFSoftShadowMap (what `shadows={true}` asks for) and
        // fell back to PCF with a warning. drei's SoftShadows still swaps in its own on desktop.
        shadows={isMobile ? false : "percentage"}
        gl={{
          // A post-processing composer (desktop, or the 3D-tiles view) renders into its own
          // multisampled target, so canvas MSAA there only costs memory. Without one
          // (mobile), the canvas antialiases itself.
          antialias: !(geo || !isMobile),
          powerPreference: "high-performance",
          outputColorSpace: THREE.SRGBColorSpace,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
      >
        <PerformanceMonitor
          bounds={() => [50, 58]}
          onDecline={() => setDpr((d) => Math.max(minDpr, d - 0.25))}
          onIncline={() => setDpr((d) => Math.min(maxDpr, d + 0.25))}
        />
        <SelectorScene
          config={config}
          cameraTarget={cameraTarget}
          cameraTargetKey={cameraTargetKey}
          isMobile={isMobile}
          autoRotate={!prefersReducedMotion && !isMobile && !selectedUnit && !capturing && !frontal}
          minDistance={span * 0.75}
          // The real neighborhood is worth pulling back for.
          maxDistance={span * (geo ? 9 : map ? 16 : 5.5)}
          apartmentColors={apartmentColors}
          dimmedIds={dimmedIds}
          showStatus={false}
          // No standing tint on the units for sale: only the hovered one is colored.
          focusFloor={focusFloor}
          hoveredId={hovered ?? listHoverMeshId}
          selectedId={selectedUnit ? meshId(selectedUnit) : null}
          openPlan={selectedPlan}
          pins={pins}
          onApartmentClick={handleApartmentClick}
          onApartmentPointerOver={handleApartmentPointerOver}
          onApartmentPointerOut={handleApartmentPointerOut}
          onReady={() => setSceneReady(true)}
          geo={geo}
          map={map}
        />
      </Canvas>

      {map && sceneReady ? <MapAttribution text={mapAttribution} /> : null}

      {/* Aerial intro: where we are, and a way out. */}
      {flying && sceneReady ? (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-20 z-20 flex justify-center px-4 md:top-8">
            <p
              key={caption ?? "none"}
              className="animate-caption-in rounded-full bg-background/70 px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.3em] text-foreground backdrop-blur-md sm:text-xs"
            >
              {caption ?? SITE.city}
            </p>
          </div>
          <button
            type="button"
            onClick={skipIntro}
            className="absolute right-4 bottom-12 z-30 rounded-full border border-border-subtle bg-background/80 px-4 py-2 text-xs font-medium backdrop-blur-md transition-colors duration-200 hover:border-accent hover:text-accent-strong md:right-6"
          >
            Saltar vuelo →
          </button>
        </>
      ) : null}

      {/* Selected unit's card: docked top right so it never covers the opened unit. */}
      {selectedUnit && sceneReady ? (
        // Phones: below the back button and right of the floor selector.
        <div className="absolute top-16 right-4 left-[4.75rem] z-[25] md:top-6 md:right-6 md:left-auto">
          <UnitPin
            unit={selectedUnit}
            photos={unitPhotos(selectedUnit)}
            pinned
            onView={embedded ? undefined : () => switchVista("departamento")}
            onClose={() => handleSelectUnit(null)}
          />
        </div>
      ) : null}
      {/* Hover preview, moved over its unit every frame by the scene. */}
      <div ref={previewRef} className="pointer-events-none invisible absolute top-0 left-0 z-[26]">
        {previewUnit && sceneReady ? (
          <UnitPin
            key={previewUnit.codigo}
            unit={previewUnit}
            photos={unitPhotos(previewUnit)}
            pinned={false}
          />
        ) : null}
      </div>

      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background transition-opacity duration-700",
          ready && sceneReady ? "opacity-0" : "opacity-100",
        )}
      >
        <p className="px-6 text-center font-mono text-xs uppercase tracking-[0.3em] text-accent-strong">
          {realLocation ? `${SITE.address} · ${SITE.city}` : PROJECT_NAME}
        </p>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground-muted">
          {!ready
            ? "Cargando unidades…"
            : geo
              ? "Cargando la ciudad en 3D…"
              : map
                ? "Cargando el mapa…"
                : "Preparando el modelo 3D…"}
        </p>
      </div>

      {ready && !capturing ? (
        <>
          <FloorSelector
            floors={config.floors}
            activeFloor={focusFloor}
            onSelectFloor={handleSelectFloor}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center bg-gradient-to-t from-background/90 to-transparent px-3 pb-2 pt-6">
            <p className="text-center font-mono text-[9px] uppercase tracking-[0.1em] text-foreground-muted/80 sm:text-[10px]">
              {geo || map
                ? `Ubicación real: ${SITE.address}, ${SITE.city} · modelo 3D ilustrativo`
                : `${PROJECT_NAME} · modelo 3D ilustrativo`}
            </p>
          </div>
        </>
      ) : null}

      {children}
    </div>
  );

  if (capturing) return stage;

  const fade = (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 z-50 bg-background transition-opacity ease-in-out",
        fading ? "opacity-100" : "opacity-0",
      )}
      style={{ transitionDuration: `${FADE_MS}ms` }}
    />
  );

  if (vista === "departamento") {
    return (
      <div ref={wrapperRef} className="relative">
        <DepartamentoExperience>
          <div className="absolute top-4 left-4 z-30 flex flex-col items-start gap-2 sm:top-6 sm:left-6">
            <button
              type="button"
              onClick={() => switchVista("edificio")}
              className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-background/85 px-4 py-2 text-xs font-medium backdrop-blur-md transition-colors duration-200 hover:border-accent hover:text-accent-strong sm:text-sm"
            >
              ← Volver al edificio
            </button>
            <p className="rounded-full bg-background/80 px-3 py-1 font-mono text-[9px] uppercase tracking-[0.15em] text-foreground-muted backdrop-blur-md sm:text-[10px]">
              Interior de ejemplo · Cataluña II, unidad 103
            </p>
          </div>
        </DepartamentoExperience>
        {fade}
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div
        className={
          embedded
            ? "grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]"
            : "flex flex-col lg:h-[100svh] lg:flex-row"
        }
      >
        <div
          className={
            embedded
              ? "relative h-[65vh] w-full overflow-hidden rounded-2xl border border-border-subtle bg-background-elevated lg:h-[70vh]"
              : "relative h-[70svh] w-full lg:h-full lg:flex-1"
          }
        >
          {stage}
        </div>
        <EdificioInfoPanel
          projectName={PROJECT_NAME}
          projectAddress={PROJECT_ADDRESS}
          projectSlug={projectSlug}
          units={units}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          orientations={orientations}
          focusFloor={focusFloor}
          selectedUnit={selectedUnit}
          onSelectUnit={handleSelectUnit}
          onHoverUnit={setListHover}
          sunHoursVerano={
            selectedUnit
              ? (sunHoursCache[civilDateKey(verano)]?.[meshId(selectedUnit)] ?? null)
              : null
          }
          sunHoursInvierno={
            selectedUnit
              ? (sunHoursCache[civilDateKey(invierno)]?.[meshId(selectedUnit)] ?? null)
              : null
          }
          className={
            embedded
              ? "h-[70vh] rounded-2xl border border-border-subtle"
              : "border-t border-border-subtle lg:h-full lg:w-[400px] lg:border-t-0 lg:border-l"
          }
        />
      </div>
      {fade}
    </div>
  );
}
