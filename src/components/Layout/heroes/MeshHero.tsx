import React, { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { motion, type Variants } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import EditText from '../../EditText';
import ImagesService from '../../../services/ImagesService';
import { useEdit, useEditAttrs } from '../../../services/editMode';
import { useStill } from '../../../hooks/useA11yPrefs';
import type { HeroConfig } from '../../../models/HeroConfig';
import type { Palette } from '../../../models/WebsiteConfig';
import { lowEnd } from './common';
import './MeshHero.css';

type RGB = [number, number, number];

const rgbOf = (hex: string | undefined, fallback: RGB): RGB => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex?.trim() ?? '');
  if (!m) return fallback;
  const n = Number.parseInt(m[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const css = (c: RGB): string => `rgb(${c.map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255)).join(' ')})`;

/** The same colour turned round the colour wheel, kept as bright: the "second" colour of the field. */
const turned = ([r, g, b]: RGB, degrees: number): RGB => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d < 0.04) return [r, g, b];
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = ((h * 60 + degrees) % 360 + 360) % 360 / 360;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channel = (t: number) => {
    const u = (t % 1 + 1) % 1;
    if (u < 1 / 6) return p + (q - p) * 6 * u;
    if (u < 1 / 2) return q;
    if (u < 2 / 3) return p + (q - p) * (2 / 3 - u) * 6;
    return p;
  };
  return [channel(h + 1 / 3), channel(h), channel(h - 1 / 3)];
};

/**
 * The field's six spots, from the site's own colours: two of the page's
 * background (so the field breathes, never a solid block), the main colour,
 * a lit and a deep version of it, and its partner across the wheel.
 */
export const meshColors = (palette: Palette | undefined, dark: boolean): RGB[] => {
  const white: RGB = [1, 1, 1];
  const bg = rgbOf(dark ? palette?.colorDarkBg : palette?.colorLightBg, dark ? [0.05, 0.05, 0.06] : [0.99, 0.97, 0.93]);
  const main = rgbOf(dark ? palette?.colorPrimaryDark : palette?.colorPrimary, dark ? [0.36, 0.7, 1] : [0.88, 0.28, 0.36]);
  const partner = turned(main, 150);
  return dark
    ? [bg, main, mix(main, white, 0.3), mix(main, bg, 0.6), mix(partner, bg, 0.15), bg]
    : [bg, mix(main, bg, 0.2), mix(main, white, 0.5), mix(main, bg, 0.55), mix(partner, bg, 0.35), bg];
};

const VERT = 'attribute vec2 a_position; void main() { gl_Position = vec4(a_position, 0.0, 1.0); }';

// Inverse-distance blending of six slowly roaming spots over a gently warped
// plane (after the mesh gradient of Paper Shaders, Apache-2.0). Positions and
// phases come from the page, so the shader never holds a growing clock.
const FRAG = `
precision mediump float;
uniform vec2 u_res;
uniform vec2 u_pos[6];
uniform vec3 u_c[6];
uniform vec4 u_warp;
uniform float u_swirl;
void main() {
  vec2 p = gl_FragCoord.xy / u_res - 0.5;
  float aspect = u_res.x / u_res.y;
  p.x *= aspect;
  p += 0.08 * vec2(sin(2.3 * p.y + u_warp.x) + 0.6 * sin(4.1 * p.y + u_warp.y), cos(1.9 * p.x + u_warp.z) + 0.5 * cos(3.7 * p.x + u_warp.w));
  float a = u_swirl * length(p);
  float cs = cos(a);
  float sn = sin(a);
  p = vec2(cs * p.x - sn * p.y, sn * p.x + cs * p.y);
  vec3 col = vec3(0.0);
  float total = 0.0;
  for (int i = 0; i < 6; i++) {
    vec2 q = p - vec2(u_pos[i].x * aspect, u_pos[i].y);
    float d = length(q);
    float w = 1.0 / (d * d * d + 0.004);
    col += u_c[i] * w;
    total += w;
  }
  gl_FragColor = vec4(col / total, 1.0);
}
`;

/** A smooth field needs few pixels: drawn small, the browser stretches it. */
const PIXELS = [150_000, 80_000, 40_000];
// About the reference's own pace (its speed 0.3): a spot goes round in about a minute.
const SPEED = 0.5;
const SLOW_FRAME_MS = 24;
const TAU = Math.PI * 2;

/** Where each spot is at `t`: six independent slow loops across the whole fold. */
export const spotsAt = (t: number): number[] => {
  const out: number[] = [];
  for (let i = 0; i < 6; i++) {
    out.push(0.5 * Math.sin(t * (0.23 + 0.05 * i) + i * 1.9), 0.42 * Math.cos(t * (0.19 + 0.04 * i) + i * 2.7));
  }
  return out;
};

const compile = (gl: WebGLRenderingContext, type: number, source: string) => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
};

/**
 * The live field. One WebGL canvas, drawn at a small fixed pixel budget; it
 * sleeps off-screen and in a hidden tab, steps down when frames run slow and,
 * at the last step (or held still, or editing), stands as one finished frame.
 * With no WebGL the still CSS field under it is the backdrop.
 */
const MeshField: React.FC<{ colors: RGB[]; still: boolean; onSleep: (asleep: boolean) => void }> = ({ colors, still, onSleep }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const [drawn, setDrawn] = useState(false);
  const key = colors.map(css).join('|');

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let gl: WebGLRenderingContext | null = null;
    try {
      gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false, failIfMajorPerformanceCaveat: true });
    } catch {
      gl = null;
    }
    if (!gl) return;
    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    const program = gl.createProgram();
    if (!vs || !fs || !program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const uRes = gl.getUniformLocation(program, 'u_res');
    const uPos = gl.getUniformLocation(program, 'u_pos');
    const uWarp = gl.getUniformLocation(program, 'u_warp');
    const uSwirl = gl.getUniformLocation(program, 'u_swirl');
    gl.uniform3fv(gl.getUniformLocation(program, 'u_c'), new Float32Array(colors.flat()));

    let step = lowEnd() ? 1 : 0;
    let raf = 0;
    let seen = true;
    let frozen = still;
    // A start of its own per page, so two sites never open on the same frame.
    let clock = 17 + (canvas.ownerDocument.location.hostname.length % 7) * 3;
    let last = 0;
    let frames = 0;
    let spent = 0;

    const resize = () => {
      const host = canvas.parentElement;
      if (!host) return;
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (w <= 0 || h <= 0) return;
      const scale = Math.min(1, Math.sqrt(PIXELS[step] / (w * h)));
      canvas.width = Math.max(2, Math.round(w * scale));
      canvas.height = Math.max(2, Math.round(h * scale));
      gl!.viewport(0, 0, canvas.width, canvas.height);
    };
    const paint = () => {
      const g = gl!;
      g.uniform2f(uRes, canvas.width, canvas.height);
      g.uniform2fv(uPos, new Float32Array(spotsAt(clock)));
      g.uniform4f(uWarp, (clock * 0.9) % TAU, (clock * 0.5) % TAU, (clock * 0.7) % TAU, (clock * 0.4) % TAU);
      g.uniform1f(uSwirl, 0.9 * Math.sin(clock * 0.13));
      g.drawArrays(g.TRIANGLES, 0, 6);
    };
    const tick = (now: number) => {
      raf = 0;
      if (!seen || document.hidden || frozen) return;
      const ms = now - last;
      last = now;
      clock += Math.min(0.05, ms / 1000) * SPEED;
      paint();
      frames += 1;
      spent += ms;
      if (frames === 45) {
        if (spent / frames > SLOW_FRAME_MS) {
          if (step < PIXELS.length - 1) {
            step += 1;
            resize();
          } else {
            frozen = true;
            return;
          }
        }
        frames = 0;
        spent = 0;
      }
      raf = requestAnimationFrame(tick);
    };
    const wake = () => {
      if (raf || frozen || !seen || document.hidden) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };

    resize();
    paint();
    setDrawn(true);
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => { resize(); paint(); });
    if (canvas.parentElement) ro?.observe(canvas.parentElement);
    const io = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      onSleep(!seen);
      if (seen) wake();
    });
    io?.observe(canvas);
    const onVisible = () => wake();
    document.addEventListener('visibilitychange', onVisible);
    wake();

    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      io?.disconnect();
      document.removeEventListener('visibilitychange', onVisible);
      gl!.deleteProgram(program);
      gl!.deleteShader(vs);
      gl!.deleteShader(fs);
      gl!.deleteBuffer(buffer);
    };
    // The colours as text: a new array with the same colours is the same field.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, still]);

  return <canvas ref={ref} className={`absolute inset-0 h-full w-full transition-opacity duration-700 ${drawn ? 'opacity-100' : 'opacity-0'}`} aria-hidden="true" data-testid="mesh-canvas" />;
};

interface MeshHeroProps {
  config: HeroConfig;
  businessName?: string;
  logo?: string;
  palette?: Palette;
  dark: boolean;
  /** The visitor asked for less motion, or the owner is editing: the field stands still. */
  still: boolean;
  /** The hero's own buttons (booking, contact), as every hero has them. */
  actions: ReactNode;
  social?: ReactNode;
  noTrack: boolean;
}

const container: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.18, delayChildren: 0.2 } } };
const item: Variants = { hidden: { y: 24, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { duration: 0.7, ease: 'easeOut' } } };

/** The name round the seal, repeated to go once round its ring. */
export const ringText = (name: string): string => {
  const clean = name.trim().replace(/\s+/g, ' ');
  if (!clean) return '';
  const times = Math.max(1, Math.min(4, Math.round(40 / (clean.length + 3))));
  return Array.from({ length: times }, () => clean).join(' • ') + ' • ';
};

/**
 * LT-605 'mesh' (festive's own, from Erel's shader hero): the site's colours
 * as a live field behind the whole fold, the words at its foot - the line in
 * a soft gradient over the title, the description, the buttons - and in the
 * far corner a seal: the business's name turning round its picture inside a
 * glowing ring. The reference's own header is the site's navbar; its glass
 * and goo filters are left out (blur over motion stalls older phones). A paid
 * design: it moves by itself.
 */
const MeshHero: React.FC<MeshHeroProps> = ({ config, businessName = '', logo, palette, dark, still: held, actions, social, noTrack }) => {
  const ed = useEditAttrs();
  const { editing } = useEdit();
  const reduced = useStill();
  const still = held || reduced;
  const colors = useMemo(() => meshColors(palette, dark), [palette, dark]);
  const [asleep, setAsleep] = useState(false);
  const [pictureFailed, setPictureFailed] = useState(false);
  const pathId = `lt-mesh-ring-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const picture = !pictureFailed ? (config.heroImageSrc || logo) : '';
  const pictureField = config.heroImageSrc ? 'components.hero.heroImageSrc' : 'logoImageName';
  const ring = ringText(businessName);
  const vars = {
    '--mesh-a': css(colors[1]),
    '--mesh-b': css(colors[4]),
    '--mesh-c': css(colors[2]),
    background: [
      `radial-gradient(at 18% 28%, ${css(colors[1])}, transparent 58%)`,
      `radial-gradient(at 82% 22%, ${css(colors[4])}, transparent 52%)`,
      `radial-gradient(at 70% 82%, ${css(colors[2])}, transparent 58%)`,
      `radial-gradient(at 28% 88%, ${css(colors[3])}, transparent 55%)`,
      css(colors[0]),
    ].join(', '),
  } as React.CSSProperties;

  return (
    <div className="lt-mesh relative min-h-screen w-full overflow-hidden" style={vars} data-asleep={asleep || still || undefined} data-testid="hero-mesh">
      <MeshField colors={colors} still={still} onSleep={setAsleep} />
      {/* The words sit on a soft veil of the page's own colour, whatever the field does behind them. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[78%] bg-gradient-to-t from-light-bg/85 via-light-bg/35 to-transparent dark:from-dark-bg/85 dark:via-dark-bg/35" aria-hidden="true" />

      <motion.div
        className="relative z-10 flex min-h-screen flex-col justify-end gap-8 px-6 pb-12 pt-[calc(var(--nav-offset,5.5rem)_+_1.5rem)] md:flex-row md:items-end md:justify-between md:px-12 md:pb-14 lg:px-16"
        initial={still ? false : 'hidden'}
        animate="visible"
        variants={container}
      >
        <div className="max-w-2xl text-light-text dark:text-dark-text">
          {config.stamp && (
            <motion.p {...ed('components.hero.stamp')} className="relative mb-6 inline-flex max-w-full items-center gap-2 rounded-full border border-light-text/15 bg-light-bg/60 px-4 py-2 text-sm font-medium dark:border-dark-text/15 dark:bg-dark-bg/50" variants={item}>
              <span className="absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent dark:via-primary-dark/60" aria-hidden="true" />
              <Sparkles className="h-4 w-4 shrink-0 text-primary-readable dark:text-primary-dark-readable" aria-hidden="true" />
              <span className={`break-words ${noTrack ? '' : 'tracking-wide'}`}>{config.stamp}</span>
            </motion.p>
          )}
          <motion.h1 className={`mb-6 leading-none ${noTrack ? '' : 'tracking-tight'}`} variants={item}>
            {config.subtitle && (
              <span className={`${editing ? 'text-primary-readable dark:text-primary-dark-readable' : 'lt-mesh-line'} mb-3 block font-light ${noTrack ? '' : 'tracking-wide'}`} style={{ fontSize: 'clamp(1.6rem, 1.1rem + 2.2vw, 3.25rem)', lineHeight: 1.15 }}>
                <EditText path="components.hero.subtitle">{config.subtitle}</EditText>
              </span>
            )}
            <span className="block font-black break-words" style={{ fontSize: 'clamp(2.6rem, 1.5rem + 4.6vw, 6rem)', lineHeight: 1.02 }}>
              <EditText path="components.hero.title">{config.title}</EditText>
            </span>
          </motion.h1>
          {config.description && (
            <motion.p className="mb-8 max-w-xl text-lg font-light leading-relaxed text-light-text/75 dark:text-dark-text/75" variants={item}>
              <EditText path="components.hero.description">{config.description}</EditText>
            </motion.p>
          )}
          <motion.div className="flex flex-wrap items-center gap-4" variants={item}>{actions}</motion.div>
          {social && <motion.div className="mt-6" variants={item}>{social}</motion.div>}
        </div>

        {(ring || picture) && (
          <motion.div className="relative order-first h-28 w-28 shrink-0 self-end md:order-none md:h-36 md:w-36" aria-hidden="true" variants={item} data-testid="mesh-seal">
            <span className="lt-mesh-glow absolute inset-[24%] rounded-full" />
            <span className="lt-mesh-ring absolute inset-[22%] rounded-full" />
            <span className="absolute inset-[27%] overflow-hidden rounded-full bg-light-surface dark:bg-dark-surface">
              {picture ? (
                <img
                  {...ed(pictureField, 'image')}
                  src={ImagesService.getInstance().getImage(picture)}
                  alt=""
                  onError={() => setPictureFailed(true)}
                  className="h-full w-full object-cover"
                />
              ) : <span className="block h-full w-full" />}
            </span>
            {/* The name on top: the glow round the ring must not veil it. */}
            {ring && (
              <svg viewBox="0 0 100 100" className="lt-mesh-spin absolute inset-0 h-full w-full overflow-visible text-light-text/80 dark:text-dark-text/80">
                <defs>
                  <path id={pathId} d="M 50,50 m -40,0 a 40,40 0 1,1 80,0 a 40,40 0 1,1 -80,0" />
                </defs>
                {/* Centred on the ring: a right-to-left line anchored at its start would run off the path. */}
                <text className="fill-current" textAnchor="middle" style={{ fontSize: 9, fontWeight: 600, letterSpacing: noTrack ? 0 : 0.6 }}>
                  <textPath href={`#${pathId}`} xlinkHref={`#${pathId}`} startOffset="50%" textLength={251} lengthAdjust="spacing">{ring}</textPath>
                </text>
              </svg>
            )}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default MeshHero;
