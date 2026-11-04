import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Ingresá tu nombre completo.").max(100),
  email: z.email("Ingresá un email válido."),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  company: z.string().trim().max(100).optional().or(z.literal("")),
  message: z.string().trim().min(10, "Contanos un poco más sobre tu proyecto.").max(2000),
  source: z.string().trim().min(1).max(100),
  company_website: z.string().trim().max(0, "Solicitud inválida."),
});

export type ContactInput = z.infer<typeof contactSchema>;
