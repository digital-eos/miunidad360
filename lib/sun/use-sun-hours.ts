"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { civilDateKey, type CivilDate } from "./sun-position";
import type { SunHoursRequest, SunHoursResponse } from "./sun-hours.worker";

export type SunHoursCache = Record<string, Record<string, number>>;

export function useSunHours(lat: number, lng: number, facadeBearing?: number) {
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<Set<string>>(new Set());
  const [cache, setCache] = useState<SunHoursCache>({});

  useEffect(() => {
    const worker = new Worker(new URL("./sun-hours.worker.ts", import.meta.url));
    const pending = pendingRef.current;
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<SunHoursResponse>) => {
      const { dateKey, hours } = event.data;
      pending.delete(dateKey);
      setCache((prev) => ({ ...prev, [dateKey]: hours }));
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
      // Any requests still in flight died with this worker instance — clear them so a
      // remount (e.g. React Strict Mode's double-invoke) can re-request against the new one.
      pending.clear();
    };
  }, []);

  const requestDate = useCallback(
    (date: CivilDate) => {
      const key = civilDateKey(date);
      if (cache[key] || pendingRef.current.has(key) || !workerRef.current) return;
      pendingRef.current.add(key);
      const request: SunHoursRequest = { dateKey: key, date, lat, lng, facadeBearing };
      workerRef.current.postMessage(request);
    },
    [cache, lat, lng, facadeBearing],
  );

  return { cache, requestDate };
}
