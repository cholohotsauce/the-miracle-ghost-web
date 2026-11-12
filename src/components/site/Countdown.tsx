"use client";

import { useTimeLeft } from "@/lib/useTimeLeft";

const UNITS = [
  ["Days", 86_400_000],
  ["Hrs", 3_600_000],
  ["Min", 60_000],
  ["Sec", 1_000],
] as const;

/** Days, hours, minutes, and seconds left until `to`. On reaching zero it reloads, so the launched site loads. */
export default function Countdown({ to }: { to: number }) {
  // Reloads at zero so the launched site loads (only if it counted down with the page open)
  const left = useTimeLeft(to, () => window.location.reload(), 250);

  return (
    <div className="mt-7 flex gap-[clamp(0.9rem,3vw,1.75rem)]" role="timer" aria-label="Time until the site opens">
      {UNITS.map(([label, size], i) => {
        // Days count up freely; every smaller unit is what's left over from the unit above it
        const value = Math.floor(((left ?? 0) % (i === 0 ? Infinity : UNITS[i - 1][1])) / size);
        const isSeconds = label === "Sec";
        return (
          <div key={label} className="text-center">
            <b
              className={`block text-[clamp(1.6rem,5vw,2.75rem)] tabular-nums tracking-[-0.02em] ${
                isSeconds ? "text-[var(--color-neon-pink)] [text-shadow:0_0_14px_rgb(255_0_255/0.55)]" : ""
              }`}
            >
              {left === null ? "--" : String(value).padStart(2, "0")}
            </b>
            <span className="text-xs uppercase tracking-[0.2em] opacity-50">{label}</span>
          </div>
        );
      })}
    </div>
  );
}
