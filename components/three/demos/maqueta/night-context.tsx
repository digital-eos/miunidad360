"use client";

import { createContext, useContext, useRef, type MutableRefObject, type ReactNode } from "react";

type NightContextValue = {
  /** Current day(0) -> night(1) blend factor, updated every frame by <NightAnimator />. */
  factorRef: MutableRefObject<number>;
  /** Target the animator eases towards. */
  targetRef: MutableRefObject<number>;
  /** Internal: eased transition bookkeeping for <NightAnimator />. */
  transitionRef: MutableRefObject<{ from: number; to: number; start: number }>;
};

const NightContext = createContext<NightContextValue | null>(null);

export function NightProvider({ children }: { children: ReactNode }) {
  const factorRef = useRef(0);
  const targetRef = useRef(0);
  const transitionRef = useRef({ from: 0, to: 0, start: 0 });

  return (
    <NightContext.Provider value={{ factorRef, targetRef, transitionRef }}>
      {children}
    </NightContext.Provider>
  );
}

export function useNightContext(): NightContextValue {
  const ctx = useContext(NightContext);
  if (!ctx) {
    throw new Error("useNightContext must be used within a NightProvider");
  }
  return ctx;
}

/** Call from outside the Canvas (e.g. a toolbar button) to start a 2s day/night transition. */
export function requestNightTransition(ctx: NightContextValue, isNight: boolean): void {
  const nextTarget = isNight ? 1 : 0;
  if (ctx.targetRef.current === nextTarget) return;
  ctx.targetRef.current = nextTarget;
  ctx.transitionRef.current = {
    from: ctx.factorRef.current,
    to: nextTarget,
    start: performance.now(),
  };
}
