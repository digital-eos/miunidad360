import * as SunCalc from "suncalc";

export type SunPosition = {
  /** Radians above (+) or below (-) the horizon. */
  altitude: number;
  /** Radians, suncalc convention: 0 = south, PI/2 = west, PI = north, -PI/2 = east. */
  azimuth: number;
};

/** A calendar day, independent of any timezone — always interpreted as Buenos Aires local time. */
export type CivilDate = { year: number; month: number; day: number };

/** Buenos Aires has used a fixed UTC-3 offset (no DST) since 2009. */
const BUENOS_AIRES_UTC_OFFSET_HOURS = 3;

/** Builds the precise UTC instant for a given Buenos Aires calendar day + local hour (may be fractional). */
export function buenosAiresDate(date: CivilDate, hour: number): Date {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  return new Date(
    Date.UTC(date.year, date.month - 1, date.day, h + BUENOS_AIRES_UTC_OFFSET_HOURS, m, 0),
  );
}

export function todayInBuenosAires(): CivilDate {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

export function solsticeDates(year: number): { verano: CivilDate; equinoccio: CivilDate; invierno: CivilDate } {
  return {
    verano: { year, month: 12, day: 21 },
    equinoccio: { year, month: 3, day: 21 },
    invierno: { year, month: 6, day: 21 },
  };
}

export function civilDateKey(date: CivilDate): string {
  return `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

export function getSunPosition(date: Date, lat: number, lng: number): SunPosition {
  const { altitude, azimuth } = SunCalc.getPosition(date, lat, lng);
  return { altitude, azimuth };
}

export type SunTimes = {
  sunrise: Date | null;
  sunset: Date | null;
};

export function getSunTimes(civilDate: CivilDate, lat: number, lng: number): SunTimes {
  const times = SunCalc.getTimes(buenosAiresDate(civilDate, 12), lat, lng);
  return { sunrise: times.sunrise, sunset: times.sunset };
}

/**
 * Unit direction vector FROM the scene center TOWARDS the sun, in world space
 * where +X = east, +Z = north, +Y = up — matching the building's own layout
 * convention (see lib/three/building-layout.ts).
 */
export function sunDirectionVector(position: SunPosition): [number, number, number] {
  const { altitude, azimuth } = position;
  const horizontal = Math.cos(altitude);
  const x = -Math.sin(azimuth) * horizontal;
  const z = -Math.cos(azimuth) * horizontal;
  const y = Math.sin(altitude);
  return [x, y, z];
}

export function formatHour(hour: number): string {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

const TIME_FORMATTER = new Intl.DateTimeFormat("es-AR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Argentina/Buenos_Aires",
});

const DATE_FORMATTER = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  timeZone: "America/Argentina/Buenos_Aires",
});

export function formatTime(date: Date | null): string {
  if (!date) return "—";
  return TIME_FORMATTER.format(date);
}

export function formatCivilDate(date: CivilDate): string {
  return DATE_FORMATTER.format(buenosAiresDate(date, 12));
}
