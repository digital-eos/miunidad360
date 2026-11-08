import { track } from "@vercel/analytics";

export type DemoKind = "selector" | "bim" | "lotes" | "departamento";

export function trackDemoClick(demo: DemoKind) {
  track("demo_click", { demo });
}

export function trackWhatsAppClick(source: string) {
  track("whatsapp_click", { source });
}

export function trackFormSubmit(source: string) {
  track("form_submit", { source });
}

export function trackFilterUsed(demo: "selector" | "lotes") {
  track("filter_used", { demo });
}

export function trackUnitOpened(
  demo: "selector" | "bim" | "lotes" | "departamento",
  unitCode: string,
) {
  track("unit_opened", { demo, unitCode });
}

export function trackCaptureModeEntered(demo: DemoKind, format: string) {
  track("capture_mode_entered", { demo, format });
}

export function trackVideoRecorded(demo: DemoKind, format: string) {
  track("video_recorded", { demo, format });
}
