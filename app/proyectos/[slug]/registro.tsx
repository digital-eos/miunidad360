import type { ComponentType } from "react";
import { CasaCitra } from "@/components/proyectos/CasaCitra";
import { CASA_CITRA_SLUG } from "@/lib/proyectos/casa-citra";

/**
 * Client project pages, served at /<cliente>/<slug> (the client is set in
 * lib/proyectos/rutas.ts). Each scene is built for its project, so a page is registered here
 * by the project's slug (the same slug as its row in the `projects` table). Privacy (private
 * link, password) is set per project in /admin and applied by ProyectoVista: pages added here
 * need no extra code for it.
 *
 * Public demos stay under /demos and are always indexed.
 */
export type ProyectoPagina = {
  /** Page body: usually the project's canvas, gallery and contact block. */
  Contenido: ComponentType;
};

export const PROYECTOS: Record<string, ProyectoPagina> = {
  [CASA_CITRA_SLUG]: { Contenido: CasaCitra },
};
