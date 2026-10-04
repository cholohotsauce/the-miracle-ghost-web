"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

/**
 * The hidden "paint the wall" mode: spray paint on the white page with a finger or the mouse.
 * Paint fades after a few seconds, so nothing is ever saved and nothing needs moderating.
 */

const COLORS = [
  { name: "Black", value: "#0a0a0a" },
  { name: "Toxic green", value: "#39ff14" },
  { name: "Pink", value: "#ff00ff" },
  { name: "Teal", value: "#00ffff" },
];

/** Seconds paint stays before it is fully gone */
const LIFE = 6;
/** Paint starts fading after this many seconds */
const HOLD = 2.5;
/** Spray nozzle radius in CSS pixels */
const NOZZLE = 22;
/** Distance between spray puffs along a stroke */
const STEP = 5;

type Puff = { x: number; y: number; color: number; born: number };
type Drip = { x: number; y: number; len: number; max: number; w: number; color: number; born: number };

/** One soft spray puff per color, with overspray specks, drawn once and stamped many times */
function makeSprite(color: string, dpr: number) {
  const size = Math.ceil(NOZZLE * 2 * dpr);
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const r = size / 2;
  const g = ctx.createRadialGradient(r, r, 0, r, r, r * 0.7);
  g.addColorStop(0, color);
  g.addColorStop(1, "transparent");
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = color;
  for (let i = 0; i < 26; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = Math.sqrt(Math.random()) * r * 0.95;
    ctx.beginPath();
    ctx.arc(r + Math.cos(a) * d, r + Math.sin(a) * d, (0.4 + Math.random() * 0.9) * dpr, 0, Math.PI * 2);
    ctx.fill();
  }
  return c;
}

export default function PaintWall({ onExit }: { onExit: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [color, setColor] = useState(0);
  const colorRef = useRef(0);
  useEffect(() => {
    colorRef.current = color;
  }, [color]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const sprites = COLORS.map((c) => makeSprite(c.value, dpr));
    const puffs: Puff[] = [];
    const drips: Drip[] = [];
    let last: { x: number; y: number } | null = null;
    let still = 0;
    let raf = 0;

    const resize = () => {
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const spray = (x: number, y: number) => {
      const now = performance.now() / 1000;
      if (last) {
        const dist = Math.hypot(x - last.x, y - last.y);
        const n = Math.min(Math.floor(dist / STEP), 60);
        for (let i = 1; i <= n; i++) {
          puffs.push({ x: last.x + ((x - last.x) * i) / n, y: last.y + ((y - last.y) * i) / n, color: colorRef.current, born: now });
        }
        still = dist < 2 ? still + 1 : 0;
      }
      puffs.push({ x, y, color: colorRef.current, born: now });
      if (puffs.length > 4000) puffs.splice(0, puffs.length - 4000);
      // Holding the can in one spot builds up paint until it runs
      if (still > 8 || Math.random() < 0.012) {
        drips.push({ x: x + (Math.random() - 0.5) * NOZZLE, y: y + NOZZLE * 0.3, len: 0, max: 30 + Math.random() * 90, w: 2 + Math.random() * 3, color: colorRef.current, born: now });
        still = 0;
      }
      last = { x, y };
    };

    const rect = () => canvas.getBoundingClientRect();
    let down = false;
    const onDown = (e: PointerEvent) => {
      down = true;
      canvas.setPointerCapture(e.pointerId);
      const r = rect();
      last = null;
      spray(e.clientX - r.left, e.clientY - r.top);
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      const r = rect();
      // Coalesced events give smoother lines on fast moves; some browsers return none
      const events = e.getCoalescedEvents?.();
      for (const ev of events?.length ? events : [e]) spray(ev.clientX - r.left, ev.clientY - r.top);
    };
    const onUp = () => {
      down = false;
      last = null;
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);

    const alphaAt = (age: number) => (age < HOLD ? 1 : Math.max(0, 1 - (age - HOLD) / (LIFE - HOLD)));

    const frame = () => {
      const now = performance.now() / 1000;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      while (puffs.length && now - puffs[0].born > LIFE) puffs.shift();
      for (const p of puffs) {
        ctx.globalAlpha = alphaAt(now - p.born);
        const s = sprites[p.color];
        ctx.drawImage(s, p.x * dpr - s.width / 2, p.y * dpr - s.height / 2);
      }
      for (let i = drips.length - 1; i >= 0; i--) {
        const d = drips[i];
        const age = now - d.born;
        if (age > LIFE) {
          drips.splice(i, 1);
          continue;
        }
        d.len = Math.min(d.max, d.len + 0.9);
        ctx.globalAlpha = alphaAt(age);
        ctx.fillStyle = COLORS[d.color].value;
        ctx.beginPath();
        ctx.roundRect((d.x - d.w / 2) * dpr, d.y * dpr, d.w * dpr, d.len * dpr, d.w * dpr);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(d.x * dpr, (d.y + d.len) * dpr, d.w * 0.8 * dpr, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onExit();
    window.addEventListener("keydown", onKey);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKey);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
    };
  }, [onExit]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      data-ui
      className="absolute inset-0 z-30"
    >
      <canvas ref={canvasRef} aria-label="Spray paint on the wall" className="absolute inset-0 h-full w-full cursor-crosshair touch-none" />
      <div className="pointer-events-none absolute inset-x-0 top-[calc(max(0.75rem,env(safe-area-inset-top))+4.5rem)] text-center font-mono text-[11px] uppercase tracking-[0.3em] text-foreground/60 md:top-28">
        Spray the wall. It fades.
      </div>
      <div className="absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+1.25rem)] flex items-center justify-center gap-3 md:bottom-8">
        <div role="radiogroup" aria-label="Paint color" className="flex gap-2 rounded-full border-2 border-foreground bg-background p-1.5">
          {COLORS.map((c, i) => (
            <button
              key={c.value}
              type="button"
              role="radio"
              aria-checked={color === i}
              aria-label={c.name}
              onClick={() => setColor(i)}
              className={`h-8 w-8 rounded-full border-2 transition-transform ${color === i ? "scale-110 border-foreground" : "border-transparent"}`}
              style={{ background: c.value }}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={onExit}
          className="h-11 rounded-full bg-foreground px-5 font-mono text-xs uppercase tracking-[0.2em] text-background"
        >
          Done
        </button>
      </div>
    </motion.div>
  );
}
