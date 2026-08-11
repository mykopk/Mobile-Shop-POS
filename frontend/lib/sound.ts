"use client";

import type { SoundKind } from "@/lib/constants";

let ctx: AudioContext | null = null;
let prefs: Record<SoundKind, boolean> = {
  click: true,
  success: true,
  error: true,
  pop: true,
};

export function setSoundPrefs(next: Record<SoundKind, boolean>) {
  prefs = next;
}

function enabled(kind: SoundKind) {
  return prefs[kind];
}

function getCtx() {
  if (typeof window === "undefined") return null;
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, start: number, duration: number, gainValue = 0.15, type: OscillatorType = "sine") {
  const audio = getCtx();
  if (!audio) return;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  const t0 = audio.currentTime + start;
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(gainValue, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

export function playSuccess() {
  if (!enabled("success")) return;
  tone(660, 0, 0.12, 0.14);
  tone(880, 0.11, 0.18, 0.14);
}

export function playError() {
  if (!enabled("error")) return;
  tone(494, 0, 0.16, 0.13);
  tone(392, 0.15, 0.16, 0.13);
  tone(311, 0.3, 0.28, 0.13);
}

export function playPop() {
  if (!enabled("pop")) return;
  tone(440, 0, 0.08, 0.12);
  tone(560, 0.04, 0.1, 0.1);
}

export function playClick() {
  if (!enabled("click")) return;
  tone(880, 0, 0.05, 0.08);
  tone(1320, 0.03, 0.07, 0.07);
}
