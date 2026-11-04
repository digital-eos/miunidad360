"use server";

import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { leads, projects } from "@/db/schema";
import { unitLeadSchema } from "@/lib/validations/unit-lead";
import { isRateLimited } from "@/lib/rate-limit";

export type UnitLeadActionResult = {
  success: boolean;
  error?: string;
};

export async function submitUnitLead(
  _prevState: UnitLeadActionResult | null,
  formData: FormData,
): Promise<UnitLeadActionResult> {
  const raw = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    source: String(formData.get("source") ?? "selector-unidad"),
    projectSlug: String(formData.get("projectSlug") ?? ""),
    unitCode: String(formData.get("unitCode") ?? ""),
    company_website: String(formData.get("company_website") ?? ""),
  };

  const parsed = unitLeadSchema.safeParse(raw);

  if (!parsed.success) {
    if (raw.company_website.length > 0) {
      return { success: true };
    }
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Revisá los datos del formulario.",
    };
  }

  const headerList = await headers();
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerList.get("x-real-ip") ??
    "unknown";

  if (isRateLimited(ip)) {
    return {
      success: false,
      error: "Ya enviaste varias consultas. Probá de nuevo en un minuto.",
    };
  }

  const data = parsed.data;

  try {
    const [project] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.slug, data.projectSlug))
      .limit(1);

    await db.insert(leads).values({
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      message: `Consulta por la unidad ${data.unitCode}.`,
      source: data.source,
      projectId: project?.id ?? null,
      unitCode: data.unitCode,
    });
  } catch (error) {
    console.error("No se pudo guardar el lead de unidad:", error);
    return {
      success: false,
      error: "No pudimos enviar tu consulta. Probá de nuevo o escribinos por WhatsApp.",
    };
  }

  return { success: true };
}
