import { computeSunHours } from "./compute-sun-hours";
import type { CivilDate } from "./sun-position";

export type SunHoursRequest = {
  dateKey: string;
  date: CivilDate;
  lat: number;
  lng: number;
};

export type SunHoursResponse = {
  dateKey: string;
  hours: Record<string, number>;
};

// Typed against `Worker` (its shape from inside the scope matches closely enough)
// since this project's tsconfig doesn't pull in the separate "webworker" lib.
const ctx = self as unknown as Worker;

ctx.onmessage = (event: MessageEvent<SunHoursRequest>) => {
  const { dateKey, date, lat, lng } = event.data;
  const hours = computeSunHours(date, lat, lng);
  const response: SunHoursResponse = { dateKey, hours };
  ctx.postMessage(response);
};
