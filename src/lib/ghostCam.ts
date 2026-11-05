"use client";

import { useSyncExternalStore } from "react";

/**
 * Ghost Cam: the site's one video player (Archie and Aes, 2026-11-04).
 * Any page can hand it a video; it opens big over the page, and can shrink into the little ghost's
 * corner and keep playing while the visitor moves around the site.
 */

export type CamVideo = {
  /** A YouTube link (any form) or a video file, e.g. "/videos/recap.mp4" */
  src: string;
  title: string;
  /** Small line under the title, e.g. "Recap" */
  label?: string;
};

export type CamState = { video: CamVideo | null; mode: "big" | "mini"; seq: number };

let state: CamState = { video: null, mode: "big", seq: 0 };
const listeners = new Set<() => void>();

function set(next: Partial<CamState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

export function playVideo(video: CamVideo) {
  // The same video again just comes back to the big screen; a new one starts fresh
  const same = state.video?.src === video.src;
  set({ video, mode: "big", seq: same ? state.seq : state.seq + 1 });
}

export const minimizeVideo = () => state.video && set({ mode: "mini" });
export const expandVideo = () => state.video && set({ mode: "big" });
export const closeVideo = () => set({ video: null, mode: "big" });

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const SERVER: CamState = { video: null, mode: "big", seq: 0 };

export function useGhostCam() {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => SERVER,
  );
}

/** The YouTube video id in a link, or null for anything else */
export function youTubeId(src: string): string | null {
  try {
    const u = new URL(src, "https://local.invalid");
    const host = u.hostname.replace(/^(www|m)\./, "");
    if (host === "youtu.be") return u.pathname.slice(1) || null;
    if (host === "youtube.com" || host === "youtube-nocookie.com") {
      return u.searchParams.get("v") ?? (u.pathname.match(/\/(?:embed|shorts|live)\/([\w-]+)/)?.[1] || null);
    }
    return null;
  } catch {
    return null;
  }
}

/** A still for a video: YouTube's own thumbnail, or none for a file */
export function videoStill(src: string): string | null {
  const id = youTubeId(src);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}
