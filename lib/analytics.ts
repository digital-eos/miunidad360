import { track } from "@vercel/analytics";

export function trackDemoClick(demo: "maqueta" | "selector" | "sol") {
  track("demo_click", { demo });
}

export function trackWhatsAppClick(source: string) {
  track("whatsapp_click", { source });
}

export function trackFormSubmit(source: string) {
  track("form_submit", { source });
}
