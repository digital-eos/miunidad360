"use server";

import { headers } from "next/headers";
import { db } from "@/lib/db";
import { leads } from "@/db/schema";
import { contactSchema } from "@/lib/validations/contact";
import { isRateLimited } from "@/lib/rate-limit";

export type ContactActionResult = {
  success: boolean;
  error?: string;
};

export async function submitContactForm(
  _prevState: ContactActionResult | null,
  formData: FormData
): Promise<ContactActionResult> {
  const raw = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    company: String(formData.get("company") ?? ""),
    message: String(formData.get("message") ?? ""),
    source: String(formData.get("source") ?? "contacto"),
    company_website: String(formData.get("company_website") ?? ""),
  };

  const parsed = contactSchema.safeParse(raw);

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

  const lead = parsed.data;

  try {
    await db.insert(leads).values({
      name: lead.name,
      email: lead.email,
      phone: lead.phone || null,
      company: lead.company || null,
      message: lead.message,
      source: lead.source,
    });
  } catch (error) {
    console.error("No se pudo guardar el lead:", error);
    return {
      success: false,
      error: "No pudimos enviar tu mensaje. Probá de nuevo o escribinos por WhatsApp.",
    };
  }

  return { success: true };
}
