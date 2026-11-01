import React, { useEffect, useRef } from 'react';
import { lowEnd } from './common';

const TAU = Math.PI * 2;
const SPACING = 26;
const DOT = 1.4;
const REST = 0.3;
const SPEED = 260;
const RING = 90;
const GROW = 2.2;
const EVERY_MS = 2600;
const MAX_RINGS = 5;

interface Ring { x: number; y: number; born: number }

/**
 * LT-531: 'sonar' (underground's own): a field of dots in the site's colour that
 * answers a tap with a ring running through it, and sends one of its own every
 * few seconds. It sleeps off-screen and in a hidden tab; held still it is a quiet
 * dot field. An older device redraws at half the rate over wider dots.
 */
const SonarField: React.FC<{ color: string; still: boolean }> = ({ color, still }) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const host = canvas?.parentElement;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !host || !ctx) return;

    const slow = lowEnd();
    const spacing = slow ? SPACING + 6 : SPACING;
    const dpr = Math.min(window.devicePixelRatio || 1, slow ? 1.5 : 2);
    let width = 0;
    let height = 0;
    let rings: Ring[] = [];
    let raf = 0;
    let timer = 0;
    let seen = true;
    let skip = false;
    let nextPing = performance.now() + EVERY_MS;

    const draw = (now: number) => {
      const lifetime = (Math.hypot(width, height) * 0.7 + RING) / SPEED;
      rings = rings.filter((r) => (now - r.born) / 1000 < lifetime);
      const live = rings.map((r) => {
        const age = (now - r.born) / 1000;
        return { x: r.x, y: r.y, radius: age * SPEED, fade: 1 - age / lifetime };
      });
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = color;
      const cols = Math.ceil(width / spacing) + 1;
      const rows = Math.ceil(height / spacing) + 1;
      const offX = (width - (cols - 1) * spacing) / 2;
      const offY = (height - (rows - 1) * spacing) / 2;
      // Every resting dot in one path; only the dots on a wavefront pay for their own.
      const hot: number[] = [];
      ctx.globalAlpha = REST;
      ctx.beginPath();
      for (let i = 0; i < cols; i++) {
        const cx = offX + i * spacing;
        for (let j = 0; j < rows; j++) {
          const cy = offY + j * spacing;
          let energy = 0;
          for (const r of live) {
            const reach = r.radius + RING;
            if (Math.abs(cx - r.x) > reach || Math.abs(cy - r.y) > reach) continue;
            const dist = Math.abs(Math.hypot(cx - r.x, cy - r.y) - r.radius);
            if (dist >= RING) continue;
            const t = 1 - dist / RING;
            energy = Math.max(energy, t * t * (3 - 2 * t) * r.fade);
          }
          if (energy < 0.01) {
            ctx.moveTo(cx + DOT, cy);
            ctx.arc(cx, cy, DOT, 0, TAU);
          } else hot.push(cx, cy, energy);
        }
      }
      ctx.fill();
      for (let k = 0; k < hot.length; k += 3) {
        ctx.globalAlpha = REST + (1 - REST) * hot[k + 2];
        ctx.beginPath();
        ctx.arc(hot[k], hot[k + 1], DOT * (1 + GROW * hot[k + 2]), 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const tick = (now: number) => {
      raf = 0;
      if (!seen || document.hidden) return;
      if (now >= nextPing) {
        rings.push({ x: width * (0.2 + Math.random() * 0.6), y: height * (0.2 + Math.random() * 0.6), born: now });
        if (rings.length > MAX_RINGS) rings.shift();
        nextPing = now + EVERY_MS;
      }
      skip = slow && !skip;
      if (!skip) draw(now);
      if (rings.length) raf = requestAnimationFrame(tick);
      else timer = window.setTimeout(() => tick(performance.now()), Math.max(16, nextPing - now));
    };
    const wake = () => {
      if (raf || still) return;
      window.clearTimeout(timer);
      raf = requestAnimationFrame(tick);
    };

    const resize = () => {
      const r = host.getBoundingClientRect();
      width = Math.max(1, Math.round(r.width));
      height = Math.max(1, Math.round(r.height));
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(performance.now());
    };
    resize();

    const onDown = (e: PointerEvent) => {
      if (still) return;
      const r = host.getBoundingClientRect();
      rings.push({ x: e.clientX - r.left, y: e.clientY - r.top, born: performance.now() });
      if (rings.length > MAX_RINGS) rings.shift();
      wake();
    };
    const onVisible = () => { if (!document.hidden) wake(); };
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
    ro?.observe(host);
    const io = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      if (seen) wake();
    });
    io?.observe(host);
    host.addEventListener('pointerdown', onDown);
    document.addEventListener('visibilitychange', onVisible);
    if (!still) {
      // One ring already under way, so the first look shows the idea.
      rings.push({ x: width * 0.62, y: height * 0.4, born: performance.now() - 500 });
      wake();
    }
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      ro?.disconnect();
      io?.disconnect();
      host.removeEventListener('pointerdown', onDown);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [color, still]);

  return <canvas ref={ref} className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true" />;
};

export default SonarField;
