"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Days, hours, minutes, seconds until a drop. Renders dashes until the browser takes over,
 * so the server and the browser never disagree about the time. Refreshes the page when it hits zero.
 */
export default function Countdown({
  to,
  className = "",
  numberClassName = "font-mono text-3xl font-black md:text-4xl",
  labelClassName = "font-mono text-[10px] tracking-[0.25em] opacity-60",
}: {
  to: string;
  className?: string;
  numberClassName?: string;
  labelClassName?: string;
}) {
  const router = useRouter();
  const target = new Date(to).getTime();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(tick, 1_000);
    return () => window.clearInterval(id);
  }, []);

  const left = now === null ? null : Math.max(0, target - now);
  useEffect(() => {
    if (left === 0) router.refresh();
  }, [left, router]);

  const parts =
    left === null
      ? ["--", "--", "--", "--"]
      : [
          Math.floor(left / 86_400_000),
          Math.floor(left / 3_600_000) % 24,
          Math.floor(left / 60_000) % 60,
          Math.floor(left / 1_000) % 60,
        ].map(pad);

  const labels = ["days", "hrs", "min", "sec"];
  return (
    <div
      role="timer"
      aria-label={left === null ? "Countdown" : `${parts[0]} days ${parts[1]} hours ${parts[2]} minutes left`}
      className={`flex gap-3 tabular-nums ${className}`}
    >
      {parts.map((p, i) => (
        <div key={labels[i]} className="flex flex-col items-center">
          <span className={`flex leading-none ${numberClassName}`}>
            {/* Each digit rolls in from above when it changes, like a slot machine (globals.css) */}
            {[...p].map((d, j) => (
              <span key={j} className="digit-slot">
                <span key={d} className="digit-roll">
                  {d}
                </span>
              </span>
            ))}
          </span>
          <span className={`mt-1 uppercase ${labelClassName}`}>{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}
