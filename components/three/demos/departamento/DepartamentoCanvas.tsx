"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { useWebGLSupport } from "@/lib/hooks/use-webgl-support";

const DepartamentoExperience = dynamic(
  () => import("./DepartamentoExperience").then((mod) => mod.DepartamentoExperience),
  { ssr: false, loading: () => <DepartamentoFallback /> },
);

function DepartamentoFallback() {
  return (
    <div className="flex h-[100svh] w-full items-center justify-center bg-background bg-grid">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent-strong">
        Cargando el departamento…
      </p>
    </div>
  );
}

export function DepartamentoCanvas({ children }: { children?: ReactNode }) {
  const supportsWebGL = useWebGLSupport();

  if (supportsWebGL === false) {
    return (
      <div className="flex h-[100svh] w-full flex-col items-center justify-center gap-3 bg-background bg-grid px-6 text-center">
        <p className="font-display text-2xl">Tu navegador no soporta WebGL</p>
        <p className="max-w-sm text-sm text-foreground-muted">
          Para ver el departamento en 3D necesitás un navegador con soporte WebGL habilitado.
        </p>
      </div>
    );
  }

  if (supportsWebGL === null) return <DepartamentoFallback />;

  return <DepartamentoExperience>{children}</DepartamentoExperience>;
}
