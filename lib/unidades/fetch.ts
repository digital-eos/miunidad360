import type { Project } from "@/db/schema";
import type { Unidad } from "./types";

export type UnidadesResponse = { project: Project; unidades: Unidad[] };

export async function fetchUnidades(projectSlug: string): Promise<UnidadesResponse> {
  const res = await fetch(`/api/projects/${projectSlug}/unidades`);
  if (!res.ok) throw new Error("fetch_failed");
  return res.json();
}
