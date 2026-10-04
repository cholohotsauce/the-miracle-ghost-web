"use client";

import { useState } from "react";
import Image from "next/image";
import type { ProductImage } from "@/lib/shopify";

const ZOOM = 2.4;

/**
 * Big product photos. Tap or click to zoom in where you pointed, move to look around, tap again to zoom out.
 * More than one photo shows thumbnails underneath.
 */
export default function ProductGallery({ images, title, children }: { images: ProductImage[]; title: string; children?: React.ReactNode }) {
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
        className={`relative block aspect-[4/5] w-full overflow-hidden border-2 border-line bg-muted ${zoom ? "cursor-zoom-out touch-none" : "cursor-zoom-in"}`}
      >
        {image && (
          <Image
            src={image.url}
            alt={image.alt}
            fill
            priority
            sizes="(min-width: 768px) 55vw, 100vw"
            className="object-contain transition-transform duration-200 ease-out"
            style={zoom ? { transform: `scale(${ZOOM})`, transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
          />
        )}
        {children}
      </button>
      {images.length > 1 && (
        <ul className="mt-3 flex gap-2 overflow-x-auto">
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
                className={`relative block h-20 w-16 overflow-hidden border-2 ${i === index ? "border-foreground" : "border-transparent opacity-60"}`}
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
