import type { ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  /** Kept for API compatibility; content no longer animates in on scroll. */
  delay?: number;
  className?: string;
};

/** Section block wrapper. Content renders in place, without scroll-triggered motion. */
export function Reveal({ children, className }: RevealProps) {
  return <div className={className}>{children}</div>;
}
