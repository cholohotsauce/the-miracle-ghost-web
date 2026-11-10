"use client";

import { useState } from "react";
import Image from "next/image";
import type { ProductImage } from "@/lib/shopify";

const ZOOM = 2.4;

/**
 * Big product photos. Tap or click to zoom in where you pointed, move to look around, tap again to zoom out.
 * More than one photo shows thumbnails underneath.
 */
export default function ProductGallery({
  images,
  title,
  framed = false,
  children,
}: {
  images: ProductImage[];
  title: string;
  /** Artwork: the painting floats with a soft shadow, like a canvas on a white wall (Aes's mockup) */
  framed?: boolean;
  children?: React.ReactNode;
}) {
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const image = images[index];

  const at = (e: { clientX: number; clientY: number; currentTarget: Element }) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 };
  };

  return (
    <div>
      <button
        type="button"
        aria-label={zoom ? `Zoom out of ${title}` : `Zoom into ${title}`}
        onClick={(e) => setZoom(zoom ? null : at(e))}
        // Mice look around by hovering; fingers by dragging
        onPointerMove={(e) => zoom && (e.pointerType === "mouse" || e.buttons) && setZoom(at(e))}
        onPointerLeave={(e) => e.pointerType === "mouse" && setZoom(null)}
        className={`relative block w-full overflow-hidden aspect-square ${zoom ? "cursor-zoom-out touch-none" : "cursor-zoom-in"}`}
      >
        {image && (
          <span className={`absolute ${framed ? "inset-[7%]" : "inset-0"}`}>
          <Image
            src={image.url}
            alt={image.alt}
            fill
            priority
            sizes="(min-width: 768px) 55vw, 100vw"
            onLoad={(e) => {
              e.currentTarget.dataset.loaded = "";
            }}
            className={`photo-in object-contain [--photo-move:0.2s] ${framed ? "drop-shadow-[0_18px_24px_rgb(0_0_0_/_0.28)]" : ""}`}
            style={zoom ? { transform: `scale(${ZOOM})`, transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
          />
          </span>
        )}
        {children}
      </button>
      {images.length > 1 && (
        <ul className="mt-4 flex justify-center gap-3 overflow-x-auto p-1">
          {images.map((img, i) => (
            <li key={img.url}>
              <button
                type="button"
                aria-label={`Photo ${i + 1} of ${images.length}`}
                aria-current={i === index}
                onClick={() => {
                  setIndex(i);
                  setZoom(null);
                }}
                className={`relative block size-20 overflow-hidden border-2 md:size-24 ${i === index ? "border-[var(--color-neon-green)]" : "border-foreground/20 hover:border-foreground"}`}
              >
                <Image src={img.url} alt="" fill sizes="64px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
