"use client";
/** Stub — ReactBits ShinyText extracted to mod. Plain text fallback. */
export default function ShinyText({ children, className }: { children: React.ReactNode; className?: string; speed?: number; [k: string]: unknown }) {
  return <span className={className}>{children}</span>;
}
