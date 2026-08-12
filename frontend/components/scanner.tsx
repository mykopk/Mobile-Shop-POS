"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { ChecksumException, DecodeHintType, FormatException, NotFoundException } from "@zxing/library";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CameraIcon, ChevronDownIcon, ChevronUpIcon, PauseIcon, PlayIcon, XIcon } from "@/components/icons";
import { playSuccess } from "@/lib/sound";

const MIN_W = 300;
const MIN_H = 240;

export function Scanner({
  title = "Scanner",
  onScan,
  onClose,
}: {
  title?: string;
  onScan: (value: string) => void;
  onClose: () => void;
}) {
  const [pos, setPos] = useState(() => ({
    x: Math.max(8, (typeof window === "undefined" ? 900 : window.innerWidth) / 2 - 210),
    y: Math.max(8, (typeof window === "undefined" ? 600 : window.innerHeight) / 2 - 260),
  }));
  const [size, setSize] = useState({ w: 420, h: 520 });
  const [camState, setCamState] = useState<"starting" | "on" | "denied">("starting");
  const [detected, setDetected] = useState<string | null>(null);
  const [slowHint, setSlowHint] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [manual, setManual] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const resize = useRef<{ sx: number; sy: number; sw: number; sh: number } | null>(null);
  const lastValue = useRef("");
  const lastTime = useRef(0);
  const pausedRef = useRef(false);
  const detectedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onScanRef = useRef(onScan);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (minimized) return;
    let reader: BrowserMultiFormatReader | null = null;
    let controls: { stop: () => void } | null = null;
    let stream: MediaStream | null = null;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          stream = null;
          return;
        }
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        const hints = new Map<DecodeHintType, unknown>([[DecodeHintType.TRY_HARDER, true]]);
        reader = new BrowserMultiFormatReader(hints);
        controls = await reader.decodeFromVideoElement(video, onFrame);
        if (cancelled) {
          controls?.stop();
          controls = null;
          stream?.getTracks().forEach((t) => t.stop());
          stream = null;
          return;
        }
        setCamState("on");
      } catch (err) {
        if (!cancelled) setCamState("denied");
        if (err instanceof Error) setCamError(err.message);
      }
    }

    function onFrame(result: { getText(): string } | undefined, error: unknown) {
      if (pausedRef.current) return;
      if (!result) {
        if (
          error &&
          !(error instanceof ChecksumException) &&
          !(error instanceof FormatException) &&
          !(error instanceof NotFoundException)
        ) {
          setCamError(error instanceof Error ? error.message : String(error));
        }
        return;
      }
      if (cancelled) return;
      const text = result.getText().trim();
      const now = Date.now();
      if (text === lastValue.current && now - lastTime.current < 2000) return;
      lastValue.current = text;
      lastTime.current = now;
      setDetected(text);
      if (detectedTimer.current) clearTimeout(detectedTimer.current);
      detectedTimer.current = setTimeout(() => setDetected(null), 1800);
      playSuccess();
      onScanRef.current(text);
    }

    timer = setTimeout(() => {
      void start();
    }, 80);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      controls?.stop();
      stream?.getTracks().forEach((t) => t.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
      if (detectedTimer.current) {
        clearTimeout(detectedTimer.current);
        detectedTimer.current = null;
      }
    };
  }, [minimized]);

  useEffect(() => {
    if (camState !== "on") return;
    const t = setTimeout(() => setSlowHint(true), 4000);
    return () => clearTimeout(t);
  }, [camState]);

  function startDrag(e: React.PointerEvent<HTMLElement>) {
    if (e.button !== 0) return;
    drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onDragMove(e: React.PointerEvent<HTMLElement>) {
    if (!drag.current) return;
    const nx = Math.min(Math.max(8, e.clientX - drag.current.dx), window.innerWidth - 60);
    const ny = Math.min(Math.max(8, e.clientY - drag.current.dy), window.innerHeight - 60);
    setPos({ x: nx, y: ny });
  }

  function endDrag() {
    drag.current = null;
  }

  function startResize(e: React.PointerEvent<HTMLElement>) {
    if (e.button !== 0) return;
    e.stopPropagation();
    resize.current = { sx: e.clientX, sy: e.clientY, sw: size.w, sh: size.h };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onResizeMove(e: React.PointerEvent<HTMLElement>) {
    if (!resize.current) return;
    const nw = Math.max(MIN_W, resize.current.sw + (e.clientX - resize.current.sx));
    const nh = Math.max(MIN_H, resize.current.sh + (e.clientY - resize.current.sy));
    setSize({
      w: Math.min(nw, window.innerWidth - 16),
      h: Math.min(nh, window.innerHeight - 16),
    });
  }

  function endResize() {
    resize.current = null;
  }

  function useManual() {
    const value = manual.trim();
    if (!value) return;
    setDetected(value);
    playSuccess();
    onScan(value);
  }

  function togglePause() {
    const video = videoRef.current;
    if (paused) {
      video?.play().catch(() => {});
      setPaused(false);
    } else {
      video?.pause();
      setPaused(true);
      setDetected(null);
    }
  }

  function toggleMinimize() {
    setMinimized((m) => !m);
  }

  function headerDragProps() {
    return {
      onPointerDown: startDrag,
      onPointerMove: onDragMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
    };
  }

  function headerButtonProps() {
    return {
      onPointerDown: (e: React.PointerEvent) => e.stopPropagation(),
    };
  }

  return (
    <>
    {minimized && (
      <div
        className="fixed z-[200] flex cursor-move select-none items-center gap-2 rounded-xl bg-white py-2 pl-3 pr-2 shadow-2xl shadow-ink-900/30 ring-1 ring-ink-100"
        style={{ left: pos.x, top: pos.y }}
        {...headerDragProps()}
      >
        <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-900">
          <CameraIcon className={`h-4 w-4 ${paused ? "text-ink-400" : "text-brand-600"}`} />
          Scanner{paused ? " · paused" : ""}
        </span>
        <span className="ml-1 flex items-center gap-0.5" {...headerButtonProps()}>
          <button
            type="button"
            onClick={togglePause}
            aria-label={paused ? "Resume scanning" : "Pause scanning"}
            className="rounded-md p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-900"
          >
            {paused ? <PlayIcon className="h-4 w-4" /> : <PauseIcon className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={toggleMinimize}
            aria-label="Restore scanner"
            className="rounded-md p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-900"
          >
            <ChevronUpIcon className="h-4 w-4" />
          </button>
          <Button variant="ghost" onClick={onClose} aria-label="Close scanner" className="px-2 py-1">
            <XIcon className="h-4 w-4" />
          </Button>
        </span>
      </div>
    )}

    <div
      className={`fixed z-[200] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl shadow-ink-900/30 ring-1 ring-ink-100 ${
        minimized ? "hidden" : ""
      }`}
      style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}
    >
      <div
        {...headerDragProps()}
        className="flex cursor-move select-none items-center justify-between border-b border-ink-100 bg-ink-50 px-4 py-2.5"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-ink-900">
          <CameraIcon className="h-4 w-4 text-brand-600" />
          {title}
        </span>
        <span className="flex items-center gap-1" {...headerButtonProps()}>
          <button
            type="button"
            onClick={togglePause}
            aria-label={paused ? "Resume scanning" : "Pause scanning"}
            className="rounded-md p-1 text-ink-400 transition hover:bg-ink-100 hover:text-ink-900"
          >
            {paused ? <PlayIcon className="h-4 w-4" /> : <PauseIcon className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={toggleMinimize}
            aria-label="Minimize scanner"
            className="rounded-md p-1 text-ink-400 transition hover:bg-ink-100 hover:text-ink-900"
          >
            <ChevronDownIcon className="h-4 w-4" />
          </button>
          <Button variant="ghost" onClick={onClose} aria-label="Close scanner" className="px-2 py-1">
            <XIcon className="h-4 w-4" />
          </Button>
        </span>
      </div>

      <div className="relative min-h-0 flex-1 bg-ink-950">
        <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full object-cover" />
        {paused && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink-950/80">
            <PauseIcon className="h-8 w-8 text-ink-400" />
            <p className="text-sm font-medium text-white">Scanning paused</p>
            <button
              type="button"
              onClick={togglePause}
              className="rounded-xl bg-brand-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              Resume
            </button>
          </div>
        )}
        {!paused && camState !== "on" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink-950 p-6 text-center text-white">
            <CameraIcon className="h-8 w-8 text-ink-500" />
            {camState === "starting" ? (
              <p className="text-sm text-ink-300">Starting camera…</p>
            ) : (
              <p className="text-sm text-ink-300">
                Camera unavailable or permission denied. Point the window at a barcode, or type the code below.
              </p>
            )}
          </div>
        )}
        {!paused && camState === "on" && !detected && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <div className="relative h-40 w-64">
              <span className="absolute left-0 top-0 h-6 w-6 rounded-tl-lg border-l-2 border-t-2 border-brand-500" />
              <span className="absolute right-0 top-0 h-6 w-6 rounded-tr-lg border-r-2 border-t-2 border-brand-500" />
              <span className="absolute bottom-0 left-0 h-6 w-6 rounded-bl-lg border-b-2 border-l-2 border-brand-500" />
              <span className="absolute bottom-0 right-0 h-6 w-6 rounded-br-lg border-b-2 border-r-2 border-brand-500" />
            </div>
            <p className="mt-3 text-center text-xs text-white/80">
              {slowHint
                ? "Hold a barcode still inside the frame and get closer."
                : "Point the camera at a barcode"}
            </p>
          </div>
        )}
        {camError && (
          <div className="absolute left-3 right-3 top-3 rounded-xl bg-red-600 px-3 py-2 text-center text-xs font-semibold text-white shadow-lg">
            {camError}
          </div>
        )}
        {detected && !paused && (
          <div className="absolute left-3 right-3 top-3 rounded-xl bg-brand-600 px-3 py-2 text-center font-mono text-sm font-bold text-white shadow-lg">
            {detected}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-ink-100 bg-white p-3">
        <div className="flex items-center gap-2">
          <Input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                useManual();
              }
            }}
            placeholder="Or type the code…"
            className="py-2"
          />
          <Button onClick={useManual} disabled={!manual.trim()}>
            Use
          </Button>
        </div>
        <p className="mt-1.5 text-center text-[11px] text-ink-400">
          Drag the title bar to move · drag the corner to resize
        </p>
      </div>

      <button
        type="button"
        aria-label="Resize"
        onPointerDown={startResize}
        onPointerMove={onResizeMove}
        onPointerUp={endResize}
        onPointerCancel={endResize}
        className="absolute bottom-8 right-0 h-5 w-5 cursor-se-resize text-ink-300 hover:text-brand-600"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <path d="M21 3 3 21" />
          <path d="M15 21 21 15" />
          <path d="M9 21 21 9" />
        </svg>
      </button>
    </div>
    </>
  );
}
