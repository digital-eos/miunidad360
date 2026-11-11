import type { ComponentType } from "react";

/**
 * Client project pages, served at /proyectos/<slug>. Each 3D scene is built for its project,
 * so a page is registered here by the project's slug (the same slug as its row in the
 * `projects` table). Privacy (private link, password) is set per project in /admin and
 * applied by app/proyectos/[slug]/page.tsx: pages added here need no extra code for it.
 *
 * Public demos stay under /demos and are always indexed.
 */
export type ProyectoPagina = {
  /** Page body: usually the project's canvas, gallery and contact block. */
  Contenido: ComponentType;
};

export const PROYECTOS: Record<string, ProyectoPagina> = {};
