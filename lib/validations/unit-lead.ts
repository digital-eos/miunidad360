import { z } from "zod";

export const unitLeadSchema = z.object({
  name: z.string().trim().min(2, "Ingresá tu nombre completo.").max(100),
  email: z.email("Ingresá un email válido."),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  source: z.string().trim().min(1).max(100),
  projectSlug: z.string().trim().min(1).max(100),
  unitCode: z.string().trim().min(1).max(20),
  company_website: z.string().trim().max(0, "Solicitud inválida."),
});

export type UnitLeadInput = z.infer<typeof unitLeadSchema>;
