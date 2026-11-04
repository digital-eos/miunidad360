const COLD: [number, number, number] = [45, 92, 138]; // cool blue — little/no direct sun
const WARM: [number, number, number] = [255, 210, 63]; // warm yellow — lots of direct sun

export const SUN_HOURS_SCALE_MAX = 10;

export function sunHoursToColor(hours: number, maxHours: number = SUN_HOURS_SCALE_MAX): string {
  const t = Math.min(1, Math.max(0, hours / maxHours));
  const rgb = COLD.map((c, i) => Math.round(c + (WARM[i] - c) * t));
  return `#${rgb.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
