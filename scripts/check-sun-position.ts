/**
 * Sanity check for lib/sun (suncalc 2 → radians, south-based azimuth).
 * Run: npx tsx scripts/check-sun-position.ts
 */
import * as SunCalc from "suncalc";
import { buenosAiresDate, getSunPosition, solsticeDates, sunDirectionVector } from "../lib/sun/sun-position";
import { computeSunHours } from "../lib/sun/compute-sun-hours";

const LAT = -38.010459;
const LNG = -57.548978;
const FACADE = 123.1;
const r2d = (r: number) => (r * 180) / Math.PI;
let ok = true;
function check(label: string, pass: boolean, info: string) {
  console.log(`${pass ? "PASS" : "FAIL"} ${label}: ${info}`);
  ok &&= pass;
}

// Mar del Plata, 21 Dec 2026 12:50 local: altitude ≈ 75°, sun to the north.
const noon = getSunPosition(buenosAiresDate({ year: 2026, month: 12, day: 21 }, 12 + 50 / 60), -38.01, -57.55);
check("altitude ≈ 75°", Math.abs(r2d(noon.altitude) - 75) < 1, `${r2d(noon.altitude).toFixed(2)}°`);
const [east, up, north] = sunDirectionVector(noon);
check("sun to the north", north > 0.2 && Math.abs(east) < 0.05, `east=${east.toFixed(3)} up=${up.toFixed(3)} north=${north.toFixed(3)}`);

// Morning sun in the east, afternoon sun in the west.
const equinox = { year: 2026, month: 3, day: 21 };
const am = sunDirectionVector(getSunPosition(buenosAiresDate(equinox, 9), LAT, LNG));
const pm = sunDirectionVector(getSunPosition(buenosAiresDate(equinox, 17), LAT, LNG));
check("09:00 sun in the east", am[0] > 0.5, `east=${am[0].toFixed(3)}`);
check("17:00 sun in the west", pm[0] < -0.5, `east=${pm[0].toFixed(3)}`);

// Site frame agrees with lib/geo's bearingToScene formula all day.
let maxErr = 0;
for (let h = 5; h <= 21; h += 0.5) {
  const date = buenosAiresDate({ year: 2026, month: 6, day: 21 }, h);
  const v2 = SunCalc.getPosition(date, LAT, LNG);
  const d = ((v2.azimuth - FACADE) * Math.PI) / 180;
  const el = (v2.altitude * Math.PI) / 180;
  const ref = [-Math.sin(d) * Math.cos(el), Math.sin(el), Math.cos(d) * Math.cos(el)];
  const got = sunDirectionVector(getSunPosition(date, LAT, LNG), FACADE);
  maxErr = Math.max(maxErr, ...got.map((g, i) => Math.abs(g - ref[i])));
}
check("site frame matches bearingToScene", maxErr < 1e-9, `max error ${maxErr.toExponential(1)}`);

// Per-unit sun hours (never more than the day's daylight).
for (const [name, date] of Object.entries(solsticeDates(2026))) {
  const times = SunCalc.getTimes(buenosAiresDate(date, 12), LAT, LNG);
  const daylight = (times.sunset!.getTime() - times.sunrise!.getTime()) / 3.6e6;
  for (const [frame, bearing] of [["site", FACADE], ["classic", undefined]] as const) {
    const hours = computeSunHours(date, LAT, LNG, bearing);
    const max = Math.max(...Object.values(hours));
    check(`${name} ${frame} ≤ daylight ${daylight.toFixed(1)} h`, max <= daylight,
      Object.entries(hours).map(([k, v]) => `${k}=${v}`).join(" "));
  }
}

process.exit(ok ? 0 : 1);
