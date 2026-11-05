"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { POSTER_URL } from "@/components/ghost/GhostPoster";
import { closeVideo, expandVideo, minimizeVideo, useGhostCam, videoStill, youTubeId, type CamVideo } from "@/lib/ghostCam";
import { track } from "@/lib/stats";

/**
 * Ghost Cam (Archie and Aes, 2026-11-04): videos never sit on the page as a plain YouTube box.
 * - Big: the page goes dark and the screen opens with a burst of TV static (no ghost over the screen: Aes, 2026-11-05).
 *   Our own controls; YouTube's buttons and titles never show.
 * - Mini: the screen shrinks into the little ghost's corner and the ghost becomes the screen: the video plays
 *   inside his body, and keeps playing while the visitor moves around the site. Click him to make it big again.
 * One player element moves between the two, so the video never restarts.
 */

type Player = {
  playing: boolean;
  ended: boolean;
  muted: boolean;
  time: number;
  duration: number;
  toggle: () => void;
  toggleMute: () => void;
  seek: (t: number) => void;
};

const fmt = (s: number) => {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
};

export default function GhostCam() {
  const { video, mode, seq } = useGhostCam();
  const reducedMotion = useReducedMotion() ?? false;
  const big = mode === "big";

  // Escape shrinks the big screen into the ghost; the page underneath can't scroll while it's big
  useEffect(() => {
    if (!video || !big) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && minimizeVideo();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [video, big]);

  return (
    <AnimatePresence>
      {video && (
        <>
          {big && (
            <motion.div
              key="cam-backdrop"
              aria-hidden
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.35 }}
              onClick={minimizeVideo}
              className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm"
            />
          )}
          <Cam key={`cam-${seq}`} video={video} big={big} reducedMotion={reducedMotion} />
        </>
      )}
    </AnimatePresence>
  );
}

function Cam({ video, big, reducedMotion }: { video: CamVideo; big: boolean; reducedMotion: boolean }) {
  const ytId = youTubeId(video.src);
  const still = videoStill(video.src);
  const yt = useYouTube(ytId);
  const file = useFileVideo(ytId ? null : video.src);
  const player: Player = ytId ? yt.player : file.player;
  const [statik, setStatik] = useState(!reducedMotion);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    track("ghost_cam_open", { title: video.title });
    if (reducedMotion) return;
    const t = window.setTimeout(() => setStatik(false), 520);
    return () => window.clearTimeout(t);
  }, [video.title, reducedMotion]);

  // A fresh burst of static each time it grows back to big
  const wasBig = useRef(big);
  useEffect(() => {
    if (big && !wasBig.current && !reducedMotion) {
      setStatik(true);
      const t = window.setTimeout(() => setStatik(false), 320);
      wasBig.current = big;
      return () => window.clearTimeout(t);
    }
    wasBig.current = big;
  }, [big, reducedMotion]);

  // Space plays and pauses while the screen is big
  useEffect(() => {
    if (!big) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" || (e.target instanceof HTMLElement && e.target.closest("button, input"))) return;
      e.preventDefault();
      player.toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [big, player]);

  const media = ytId ? yt.mount : file.mount;
  const showCover = !player.playing;

  return (
    <motion.div
      layout={!reducedMotion}
      role="dialog"
      aria-modal={big}
      aria-label={`${video.title}${video.label ? `, ${video.label}` : ""}: video`}
      initial={reducedMotion ? false : { opacity: 0, scale: 0.2, x: "-40vw", y: "40vh" }}
      animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, scale: 0.2, x: big ? "-40vw" : 0, y: big ? "40vh" : 40 }}
      transition={{ type: "spring", stiffness: 210, damping: 26, mass: 0.9 }}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      className={
        big
          ? "fixed inset-x-0 top-[calc(50%+1.5rem)] z-[61] mx-auto w-[min(92vw,calc((100dvh-19rem)*16/9),72rem)] -translate-y-1/2"
          : // The little ghost's own spot and size (MiniGhost.tsx), so he simply turns into the screen
            "fixed bottom-[calc(env(safe-area-inset-bottom)+0.25rem)] left-0 z-[45] h-[6.75rem] w-[5.25rem] md:bottom-0 md:left-2 md:h-48 md:w-40"
      }
    >
      {big && (
        <div className="mb-3 flex items-end justify-between gap-4 text-white md:mb-4">
          <p className="min-w-0">
            <span className="block truncate font-drip text-[clamp(1.5rem,4vw,2.75rem)] uppercase leading-none">{video.title}</span>
            {video.label && (
              <span className="mt-1.5 block font-mono text-xs uppercase tracking-[0.2em] text-white/60">{video.label}</span>
            )}
          </p>
        </div>
      )}

      <div className={big ? "relative" : "h-full w-full"}>
        {/* The screen. In mini mode it takes the ghost's shape, and his shading and face sit over the video. */}
        <div
        className={`relative overflow-hidden bg-black ${
          big ? "aspect-video w-full rounded-[22px] shadow-[8px_8px_0_var(--color-neon-green),0_0_60px_rgb(0_255_255/0.25)]" : "h-full w-full cursor-pointer"
        }`}
        style={
          big
            ? undefined
            : {
                maskImage: `url(${POSTER_URL})`,
                WebkitMaskImage: `url(${POSTER_URL})`,
                maskSize: "contain",
                WebkitMaskSize: "contain",
                maskPosition: "center",
                WebkitMaskPosition: "center",
                maskRepeat: "no-repeat",
                WebkitMaskRepeat: "no-repeat",
              }
        }
        onClick={big ? player.toggle : expandVideo}
      >
        {/* The video itself. Mini: wide enough to fill the ghost's body, centered on him. */}
        <div
          aria-hidden
          className={`pointer-events-none absolute ${big ? "inset-0" : "left-1/2 top-0 aspect-video h-full -translate-x-1/2"}`}
        >
          <div ref={media} className="h-full w-full [&>*]:h-full [&>*]:w-full" />
        </div>

        {/* Before it plays and while it's paused: our own cover, so YouTube's titles and buttons never show */}
        <AnimatePresence>
          {showCover && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="pointer-events-none absolute inset-0 grid place-items-center bg-black"
            >
              {still && (
                // eslint-disable-next-line @next/next/no-img-element -- the video's own still, from YouTube
                <img src={still} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45 grayscale" />
              )}
              {big && (
                <span className="relative grid size-20 place-items-center rounded-full bg-[var(--color-neon-green)] text-foreground shadow-[0_0_40px_rgb(57_255_20/0.55)] md:size-24">
                  <PlayIcon className="ml-1 size-8 md:size-10" />
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bad-signal static as the screen switches on, like the teaser's SOON */}
        {statik && <span aria-hidden className="cam-static pointer-events-none absolute inset-0" />}
        {big && <span aria-hidden className="cam-scan pointer-events-none absolute inset-0" />}

        {/* Mini: the ghost's own shading and face over the video */}
        {!big && (
          // eslint-disable-next-line @next/next/no-img-element -- same still as the mini ghost
          <img
            src={POSTER_URL}
            alt=""
            aria-hidden
            draggable={false}
            className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain opacity-90 mix-blend-soft-light"
          />
        )}
        {/* ...and his eyes and smile, drawn on top so he still looks back at you (same spots as on the still) */}
        {!big && (
          <svg aria-hidden viewBox="0 0 809 900" preserveAspectRatio="xMidYMid meet" className="pointer-events-none absolute inset-0 h-full w-full">
            <g fill="none" stroke="#0a0a0a" strokeLinecap="round">
              <path d="M345 142V398M463 142V398" strokeWidth="13" />
              <path d="M315 404Q404 474 493 404" strokeWidth="7" />
            </g>
          </svg>
        )}
      </div>

      </div>

      {big ? (
        <Controls player={player} />
      ) : (
        <>
          {/* Mini: a breathing green dot says it's still playing; hover for the buttons */}
          <span
            aria-hidden
            className={`pointer-events-none absolute right-[14%] top-[16%] size-2.5 rounded-full md:size-3 ${
              player.playing ? "teaser-dot bg-[var(--color-neon-green)]" : "bg-white/70"
            }`}
          />
          <div
            className={`absolute -top-2 left-[58%] flex gap-1.5 transition-opacity duration-200 md:left-[62%] ${
              hovered ? "opacity-100" : "opacity-100 md:opacity-0 md:focus-within:opacity-100"
            }`}
          >
            <MiniButton label="Make the video big" onClick={expandVideo}>
              <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" />
              </svg>
            </MiniButton>
            <MiniButton label="Close the video" onClick={closeVideo}>
              <span className="font-mono text-sm leading-none">×</span>
            </MiniButton>
          </div>
        </>
      )}
    </motion.div>
  );
}

function MiniButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="grid size-7 place-items-center rounded-full border-2 border-foreground bg-background text-foreground transition-colors hover:bg-[var(--color-neon-green)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
    >
      {children}
    </button>
  );
}

function Controls({ player }: { player: Player }) {
  const bar = useRef<HTMLDivElement>(null);
  const seekAt = (clientX: number) => {
    const r = bar.current?.getBoundingClientRect();
    if (!r || !player.duration) return;
    player.seek(Math.max(0, Math.min(1, (clientX - r.left) / r.width)) * player.duration);
  };
  const progress = player.duration ? player.time / player.duration : 0;

  return (
    <div className="mt-5 flex items-center gap-3 text-white md:mt-6 md:gap-4">
      <CamButton label={player.playing ? "Pause" : player.ended ? "Play again" : "Play"} onClick={player.toggle} strong>
        {player.playing ? (
          <svg viewBox="0 0 24 24" className="size-5" fill="currentColor">
            <path d="M6.5 4h4v16h-4zM13.5 4h4v16h-4z" />
          </svg>
        ) : (
          <PlayIcon className="ml-0.5 size-5" />
        )}
      </CamButton>

      {/* Progress: a green line you can click or drag along */}
      <div
        ref={bar}
        role="slider"
        tabIndex={0}
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={Math.round(player.duration)}
        aria-valuenow={Math.round(player.time)}
        aria-valuetext={`${fmt(player.time)} of ${fmt(player.duration)}`}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          seekAt(e.clientX);
        }}
        onPointerMove={(e) => e.buttons === 1 && seekAt(e.clientX)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") player.seek(Math.min(player.duration, player.time + 5));
          if (e.key === "ArrowLeft") player.seek(Math.max(0, player.time - 5));
        }}
        className="group relative h-8 flex-1 cursor-pointer touch-none outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <span className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/20" />
        <span
          className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-[var(--color-neon-green)] shadow-[0_0_12px_var(--color-neon-green)]"
          style={{ width: `${progress * 100}%` }}
        />
        <span
          className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--color-neon-green)] transition-transform group-hover:scale-125"
          style={{ left: `${progress * 100}%` }}
        />
      </div>

      <span className="hidden w-[5.5rem] shrink-0 text-right font-mono text-xs tabular-nums tracking-[0.1em] text-white/70 sm:block">
        {fmt(player.time)} / {fmt(player.duration)}
      </span>

      <CamButton label={player.muted ? "Sound on" : "Mute"} onClick={player.toggleMute}>
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
          {player.muted ? <path d="M17 9l5 5M22 9l-5 5" /> : <path d="M17 8.5a5 5 0 0 1 0 7M19.5 6a8.5 8.5 0 0 1 0 12" />}
        </svg>
      </CamButton>
      {/* Shrink into the ghost: the video keeps playing in the corner */}
      <CamButton label="Shrink into the ghost and keep watching" onClick={minimizeVideo}>
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 4l-7 7M13 5v6h6M4 20h7" />
        </svg>
      </CamButton>
      <CamButton label="Close the video" onClick={closeVideo}>
        <span className="font-mono text-lg leading-none">×</span>
      </CamButton>
    </div>
  );
}

function CamButton({ label, onClick, strong, children }: { label: string; onClick: () => void; strong?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`grid size-11 shrink-0 place-items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
        strong
          ? "bg-[var(--color-neon-green)] text-foreground hover:bg-white"
          : "border-2 border-white/70 text-white hover:border-[var(--color-neon-green)] hover:text-[var(--color-neon-green)]"
      }`}
    >
      {children}
    </button>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M7 4.5v15l13-7.5z" />
    </svg>
  );
}

/* ---------- Players ---------- */

type YTPlayer = {
  playVideo(): void;
  pauseVideo(): void;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  seekTo(s: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  destroy(): void;
};
type YTNamespace = {
  Player: new (
    el: HTMLElement,
    opts: {
      videoId: string;
      host?: string;
      playerVars?: Record<string, number | string>;
      events?: { onReady?: () => void; onStateChange?: (e: { data: number }) => void };
    },
  ) => YTPlayer;
};

let ytApi: Promise<YTNamespace> | null = null;
function loadYouTube(): Promise<YTNamespace> {
  const w = window as unknown as { YT?: YTNamespace & { loaded?: number }; onYouTubeIframeAPIReady?: () => void };
  if (w.YT?.Player) return Promise.resolve(w.YT);
  ytApi ??= new Promise((resolve) => {
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(w.YT!);
    };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.async = true;
    document.head.appendChild(s);
  });
  return ytApi;
}

/** A YouTube video with its own buttons hidden; Ghost Cam's controls drive it */
function useYouTube(id: string | null) {
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const p = useRef<YTPlayer | null>(null);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [muted, setMuted] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!id || !host) return;
    let gone = false;
    const el = document.createElement("div");
    host.appendChild(el);
    loadYouTube().then((YT) => {
      if (gone) return;
      p.current = new YT.Player(el, {
        videoId: id,
        host: "https://www.youtube-nocookie.com",
        playerVars: { autoplay: 1, controls: 0, disablekb: 1, fs: 0, iv_load_policy: 3, modestbranding: 1, playsinline: 1, rel: 0 },
        events: {
          onReady: () => {
            setDuration(p.current?.getDuration() ?? 0);
            p.current?.playVideo();
          },
          onStateChange: ({ data }) => {
            setPlaying(data === 1);
            setEnded(data === 0);
            if (data === 1) setDuration(p.current?.getDuration() ?? 0);
          },
        },
      });
    });
    const tick = window.setInterval(() => {
      if (p.current?.getCurrentTime) setTime(p.current.getCurrentTime());
    }, 250);
    return () => {
      gone = true;
      window.clearInterval(tick);
      p.current?.destroy();
      p.current = null;
      el.remove();
    };
  }, [id, host]);

  const toggle = useCallback(() => {
    const yp = p.current;
    if (!yp) return;
    if (yp.getPlayerState() === 1) yp.pauseVideo();
    else {
      if (yp.getPlayerState() === 0) yp.seekTo(0, true);
      yp.playVideo();
    }
  }, []);
  const toggleMute = useCallback(() => {
    const yp = p.current;
    if (!yp) return;
    if (yp.isMuted()) yp.unMute();
    else yp.mute();
    setMuted(!yp.isMuted());
  }, []);
  const seek = useCallback((t: number) => {
    p.current?.seekTo(t, true);
    setTime(t);
  }, []);

  return { mount: setHost, player: { playing, ended, muted, time, duration, toggle, toggleMute, seek } };
}

/** A video file from the site itself */
function useFileVideo(src: string | null) {
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const v = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [muted, setMuted] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!src || !host) return;
    const el = document.createElement("video");
    el.src = src;
    el.playsInline = true;
    el.preload = "auto";
    el.className = "h-full w-full object-cover";
    const on = (name: string, fn: () => void) => el.addEventListener(name, fn);
    on("play", () => {
      setPlaying(true);
      setEnded(false);
    });
    on("pause", () => setPlaying(false));
    on("ended", () => setEnded(true));
    on("timeupdate", () => setTime(el.currentTime));
    on("loadedmetadata", () => setDuration(el.duration));
    on("volumechange", () => setMuted(el.muted));
    host.appendChild(el);
    v.current = el;
    el.play().catch(() => {
      // Some browsers only start with the sound off
      el.muted = true;
      el.play().catch(() => {});
    });
    return () => {
      el.pause();
      el.remove();
      v.current = null;
    };
  }, [src, host]);

  const toggle = useCallback(() => {
    const el = v.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => {});
    else el.pause();
  }, []);
  const toggleMute = useCallback(() => {
    if (v.current) v.current.muted = !v.current.muted;
  }, []);
  const seek = useCallback((t: number) => {
    if (v.current) v.current.currentTime = t;
  }, []);

  return { mount: setHost, player: { playing, ended, muted, time, duration, toggle, toggleMute, seek } };
}
