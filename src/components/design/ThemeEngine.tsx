'use client';

import { useEffect } from 'react';

/**
 * ThemeEngine — динамическая тема по времени суток.
 *
 * 4 опорные точки:
 *   05:00 — рассвет (тёплые зелёные + мягкий gold)
 *   12:00 — полдень (светло-зелёные, яркий gold)
 *   19:00 — закат  (глубокие тёплые зелёные, оранжево-золотой)
 *   00:00 — полночь (текущая тёмная палитра)
 *
 * Между опорными — линейная интерполяция RGB.
 * Обновление каждые 5 минут.
 */

interface Palette {
  bgPrimary: [number, number, number];
  bgSurface: [number, number, number];
  bgCard: [number, number, number, number]; // rgba
  bgSidebar: [number, number, number, number];
  gold: [number, number, number];
  goldLight: [number, number, number];
  textCream: [number, number, number];
  glassBg: [number, number, number, number];
}

const midnight: Palette = {
  bgPrimary: [3, 20, 16],
  bgSurface: [11, 31, 25],
  bgCard: [6, 26, 22, 0.45],
  bgSidebar: [4, 15, 12, 0.96],
  gold: [212, 175, 55],
  goldLight: [232, 212, 139],
  textCream: [245, 240, 232],
  glassBg: [6, 26, 22, 0.45],
};

const dawn: Palette = {
  bgPrimary: [12, 38, 30],
  bgSurface: [20, 50, 40],
  bgCard: [15, 42, 35, 0.5],
  bgSidebar: [10, 32, 26, 0.96],
  gold: [218, 185, 70],
  goldLight: [235, 218, 150],
  textCream: [248, 244, 238],
  glassBg: [15, 42, 35, 0.5],
};

const noon: Palette = {
  bgPrimary: [22, 58, 46],
  bgSurface: [30, 68, 54],
  bgCard: [25, 60, 48, 0.5],
  bgSidebar: [18, 48, 38, 0.96],
  gold: [224, 190, 80],
  goldLight: [240, 225, 160],
  textCream: [252, 249, 244],
  glassBg: [25, 60, 48, 0.5],
};

const sunset: Palette = {
  bgPrimary: [10, 30, 22],
  bgSurface: [16, 40, 32],
  bgCard: [10, 34, 28, 0.48],
  bgSidebar: [8, 25, 18, 0.96],
  gold: [220, 170, 50],
  goldLight: [236, 210, 130],
  textCream: [250, 245, 237],
  glassBg: [10, 34, 28, 0.48],
};

const keyframes: { hour: number; palette: Palette }[] = [
  { hour: 0, palette: midnight },
  { hour: 5, palette: dawn },
  { hour: 12, palette: noon },
  { hour: 19, palette: sunset },
  { hour: 24, palette: midnight },
];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpPalette(a: Palette, b: Palette, t: number): Palette {
  return {
    bgPrimary: [lerp(a.bgPrimary[0], b.bgPrimary[0], t), lerp(a.bgPrimary[1], b.bgPrimary[1], t), lerp(a.bgPrimary[2], b.bgPrimary[2], t)],
    bgSurface: [lerp(a.bgSurface[0], b.bgSurface[0], t), lerp(a.bgSurface[1], b.bgSurface[1], t), lerp(a.bgSurface[2], b.bgSurface[2], t)],
    bgCard: [lerp(a.bgCard[0], b.bgCard[0], t), lerp(a.bgCard[1], b.bgCard[1], t), lerp(a.bgCard[2], b.bgCard[2], t), lerp(a.bgCard[3], b.bgCard[3], t)],
    bgSidebar: [lerp(a.bgSidebar[0], b.bgSidebar[0], t), lerp(a.bgSidebar[1], b.bgSidebar[1], t), lerp(a.bgSidebar[2], b.bgSidebar[2], t), lerp(a.bgSidebar[3], b.bgSidebar[3], t)],
    gold: [lerp(a.gold[0], b.gold[0], t), lerp(a.gold[1], b.gold[1], t), lerp(a.gold[2], b.gold[2], t)],
    goldLight: [lerp(a.goldLight[0], b.goldLight[0], t), lerp(a.goldLight[1], b.goldLight[1], t), lerp(a.goldLight[2], b.goldLight[2], t)],
    textCream: [lerp(a.textCream[0], b.textCream[0], t), lerp(a.textCream[1], b.textCream[1], t), lerp(a.textCream[2], b.textCream[2], t)],
    glassBg: [lerp(a.glassBg[0], b.glassBg[0], t), lerp(a.glassBg[1], b.glassBg[1], t), lerp(a.glassBg[2], b.glassBg[2], t), lerp(a.glassBg[3], b.glassBg[3], t)],
  };
}

function getCurrentPalette(): Palette {
  const now = new Date();
  const hour = now.getHours() + now.getMinutes() / 60;

  for (let i = 0; i < keyframes.length - 1; i++) {
    const curr = keyframes[i];
    const next = keyframes[i + 1];
    if (hour >= curr.hour && hour < next.hour) {
      const t = (hour - curr.hour) / (next.hour - curr.hour);
      return lerpPalette(curr.palette, next.palette, t);
    }
  }
  return midnight;
}

function rgb(c: [number, number, number]): string {
  return `${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])}`;
}

function applyPalette(p: Palette) {
  const root = document.documentElement;
  root.style.setProperty('--bg-primary', `rgb(${rgb(p.bgPrimary)})`);
  root.style.setProperty('--bg-surface', `rgb(${rgb(p.bgSurface)})`);
  root.style.setProperty('--bg-card', `rgba(${rgb(p.bgCard as unknown as [number, number, number])}, ${p.bgCard[3].toFixed(2)})`);
  root.style.setProperty('--bg-sidebar', `rgba(${rgb(p.bgSidebar as unknown as [number, number, number])}, ${p.bgSidebar[3].toFixed(2)})`);
  root.style.setProperty('--gold', `rgb(${rgb(p.gold)})`);
  root.style.setProperty('--gold-light', `rgb(${rgb(p.goldLight)})`);
  root.style.setProperty('--text-cream', `rgb(${rgb(p.textCream)})`);
  root.style.setProperty('--glass-bg', `rgba(${rgb(p.glassBg as unknown as [number, number, number])}, ${p.glassBg[3].toFixed(2)})`);

  const [r, g, b] = p.gold;
  root.style.setProperty('--gold-soft', `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, 0.10)`);
  root.style.setProperty('--gold-border', `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, 0.12)`);
  root.style.setProperty('--gold-glow', `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, 0.3)`);
  root.style.setProperty('--glass-border', `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, 0.12)`);
}

export default function ThemeEngine() {
  useEffect(() => {
    applyPalette(getCurrentPalette());

    const interval = setInterval(() => {
      applyPalette(getCurrentPalette());
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return null;
}
