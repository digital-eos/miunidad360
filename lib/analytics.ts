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

export function trackFilterUsed(demo: "selector") {
  track("filter_used", { demo });
}

export function trackUnitOpened(demo: "selector" | "sol", unitCode: string) {
  track("unit_opened", { demo, unitCode });
}

export function trackCaptureModeEntered(demo: "maqueta" | "selector" | "sol", format: string) {
  track("capture_mode_entered", { demo, format });
}

export function trackVideoRecorded(demo: "maqueta" | "selector" | "sol", format: string) {
  track("video_recorded", { demo, format });
}
