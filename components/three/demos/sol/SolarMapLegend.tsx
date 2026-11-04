import { sunHoursToColor, SUN_HOURS_SCALE_MAX } from "@/lib/sun/color-scale";

export function SolarMapLegend() {
  const stops = [0, 2.5, 5, 7.5, 10].map((h) => Math.min(h, SUN_HOURS_SCALE_MAX));
  const gradient = `linear-gradient(to right, ${stops.map((h) => sunHoursToColor(h)).join(", ")})`;

  return (
    <div className="pointer-events-none absolute left-4 top-20 w-48 rounded-xl border border-border-subtle bg-background/85 p-3 backdrop-blur-md sm:left-6 sm:top-24">
      <p className="text-xs font-medium">Horas de sol directo</p>
      <div className="mt-2 h-2 w-full rounded-full" style={{ background: gradient }} />
      <div className="mt-1 flex justify-between font-mono text-[10px] text-foreground-muted">
        <span>0 h</span>
        <span>{SUN_HOURS_SCALE_MAX}+ h</span>
      </div>
    </div>
  );
}
