import { Resend } from "resend";

/**
 * Sends the magic-link email through Resend.
 *
 * Without RESEND_API_KEY the link is printed to the server console in development, so the
 * flow can be tried locally; in production a missing key is an error.
 */
export async function enviarLinkMagico(email: string, url: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    if (process.env.NODE_ENV !== "production") {
      console.info(
        `[auth] Link mágico para ${email} (sin RESEND_API_KEY/EMAIL_FROM): ${url}`
      );
      return;
    }
    throw new Error(
      "Faltan RESEND_API_KEY o EMAIL_FROM: no se puede enviar el link de acceso."
    );
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: email,
    subject: "Tu link para entrar a MiUnidad360",
    text: [
      "Hola,",
      "",
      "Hacé clic en este link para entrar al panel de MiUnidad360:",
      url,
      "",
      "El link vence en 15 minutos y sirve una sola vez.",
      "Si no lo pediste, ignorá este email.",
    ].join("\n"),
    html: `<p>Hola,</p>
<p>Hacé clic en este link para entrar al panel de MiUnidad360:</p>
<p><a href="${url}">Entrar a MiUnidad360</a></p>
<p>El link vence en 15 minutos y sirve una sola vez.<br/>Si no lo pediste, ignorá este email.</p>`,
  });
  if (error) {
    throw new Error(`Resend no pudo enviar el link: ${error.message}`);
  }
}
