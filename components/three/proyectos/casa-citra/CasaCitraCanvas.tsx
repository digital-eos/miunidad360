"use client";

import dynamic from "next/dynamic";
import { useWebGLSupport } from "@/lib/hooks/use-webgl-support";

function Cargando() {
  return (
    <div className="flex h-[70svh] min-h-[26rem] w-full items-center justify-center rounded-lg border border-border-subtle bg-background bg-grid lg:h-[78svh]">
      <p className="eyebrow">Cargando la casa en 3D…</p>
    </div>
  );
}

// three.js only runs in the browser, and only loads when this section is rendered.
const CasaCitraExperience = dynamic(
  () => import("./CasaCitraExperience").then((m) => m.CasaCitraExperience),
  { ssr: false, loading: () => <Cargando /> }
);

export function CasaCitraCanvas() {
  const webgl = useWebGLSupport();
  if (webgl === null) return <Cargando />;
  if (webgl === false) {
    return (
      <div className="flex h-[40svh] w-full flex-col items-center justify-center gap-2 rounded-lg border border-border-subtle bg-background bg-grid px-6 text-center">
        <p className="font-display text-xl">Tu navegador no muestra 3D</p>
        <p className="max-w-sm text-sm text-foreground-muted">
          Para recorrer la casa en 3D hace falta un navegador con WebGL. Las plantas de abajo
          tienen la misma información.
        </p>
      </div>
    );
  }
  return <CasaCitraExperience />;
}
