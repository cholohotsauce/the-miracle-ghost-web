"use client";

import { POSTER_URL } from "@/components/ghost/GhostPoster";
import { GHOST_QUESTION, GHOST_SENT } from "./ghostMessage";

/** Instagram story-friendly portrait card */
const W = 1080;
const H = 1350;

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** The font family next/font gave the drip lettering (its real name is hashed) */
function dripFamily() {
  const probe = document.createElement("span");
  probe.className = "font-drip";
  document.body.appendChild(probe);
  const family = getComputedStyle(probe).fontFamily;
  probe.remove();
  return family || "Impact, sans-serif";
}

/** Splits text into lines that fit `max` pixels */
function wrap(ctx: CanvasRenderingContext2D, text: string, max: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > max && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function bubble(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, tailX: number) {
  const r = 56;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.lineTo(tailX + 34, y + h);
  ctx.lineTo(tailX, y + h + 52);
  ctx.lineTo(tailX - 22, y + h);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Draws "The Miracle Ghost told me off": the ghost's question and his parting shot, ready for Instagram */
export async function drawInsultCard(): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2D canvas");

  await document.fonts.ready;
  const drip = dripFamily();
  const ghost = await loadImage(POSTER_URL);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // Spray specks on the wall
  ctx.fillStyle = "#0a0a0a";
  for (let i = 0; i < 26; i++) {
    const a = Math.sin(i * 91.7) * 1e4;
    const b = Math.sin(i * 37.3) * 1e4;
    ctx.globalAlpha = 0.35 + (i % 4) * 0.15;
    ctx.beginPath();
    ctx.arc((a - Math.floor(a)) * W, (b - Math.floor(b)) * H, 2 + (i % 4) * 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // The ghost, bottom center
  const gh = 640;
  const gw = (ghost.width / ghost.height) * gh;
  ctx.drawImage(ghost, (W - gw) / 2, H - gh - 210, gw, gh);

  // His question in a speech bubble
  ctx.font = `86px ${drip}`;
  const lines = wrap(ctx, GHOST_QUESTION.toUpperCase(), W - 280);
  const bh = 90 + lines.length * 92;
  const by = 80;
  bubble(ctx, 90, by, W - 180, bh, W / 2 + 40);
  ctx.fillStyle = "#0a0a0a";
  ctx.save();
  ctx.translate(14, 14);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.lineWidth = 9;
  ctx.strokeStyle = "#0a0a0a";
  ctx.stroke();
  ctx.fillStyle = "#0a0a0a";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  lines.forEach((l, i) => ctx.fillText(l, W / 2, by + 52 + i * 92));

  // His parting shot, in neon pink
  ctx.font = `64px ${drip}`;
  ctx.fillStyle = "#ff00ff";
  ctx.fillText(GHOST_SENT.toUpperCase(), W / 2, by + bh + 80);

  // Footer
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, H - 150, W, 150);
  ctx.fillStyle = "#ffffff";
  ctx.font = `56px ${drip}`;
  ctx.fillText("THE MIRACLE GHOST TOLD ME OFF", W / 2, H - 125);
  ctx.font = "600 28px ui-monospace, monospace";
  ctx.fillStyle = "#39ff14";
  ctx.fillText(location.host.toUpperCase(), W / 2, H - 52);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"));
}

/**
 * Opens the phone's share sheet with the card (so it can go straight to Instagram), or downloads it.
 * Safari only allows sharing right after a tap, so draw the card beforehand and pass it in.
 */
export async function shareInsultCard(blob: Blob) {
  const file = new File([blob], "the-miracle-ghost-told-me-off.png", { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "The Miracle Ghost told me off" });
      return "shared";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return "cancelled";
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5_000);
  return "downloaded";
}
