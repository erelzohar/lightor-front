import React, { useEffect, useRef } from 'react';
import { lowEnd } from './common';

const VERT = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAG = `
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_count;
uniform float u_iridescence;
uniform float u_pull;
uniform float u_dark;
uniform vec2 u_mouse;
uniform vec2 u_light;
uniform vec3 u_f0;

const float TAU = 6.28318530718;
const float TILT = -0.32;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float lines(float x, float seed) {
  float i = floor(x);
  float f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(hash(vec2(i, seed)), hash(vec2(i + 1.0, seed)), f);
}

vec2 rotate(vec2 p, float a) {
  float c = cos(a);
  float s = sin(a);
  return vec2(c * p.x - s * p.y, s * p.x + c * p.y);
}

float spine(float x, float k, float lane, float t, vec2 m) {
  float y = lane;
  y += 0.13 * sin(1.15 * x + 0.55 * t + 2.1 * k);
  y += 0.06 * sin(2.6 * x - 0.8 * t + 1.3 * k + 0.7);
  y += 0.025 * sin(5.3 * x + 1.3 * t + 4.0 * k);
  float near = exp(-(x - m.x) * (x - m.x) * 5.0);
  y += (m.y - y) * 0.22 * u_pull * near;
  return y;
}

vec3 studio(vec3 r, float t) {
  float a = 0.28 * sin(t * 0.11);
  r.xz = rotate(r.xz, a);
  float y = r.y;

  vec3 top = mix(vec3(0.82, 0.83, 0.86), vec3(0.025, 0.025, 0.028), u_dark);
  vec3 horizon = mix(vec3(1.0), vec3(0.16, 0.16, 0.17), u_dark);
  vec3 ground = mix(vec3(0.05, 0.05, 0.055), vec3(0.004), u_dark);
  vec3 sky = mix(horizon, top, smoothstep(0.0, 0.85, y));
  vec3 floor_ = mix(ground * 2.4, ground, smoothstep(0.0, -0.5, y));
  vec3 c = mix(floor_, sky, smoothstep(-0.025, 0.025, y));

  float box = smoothstep(0.6, 0.45, abs(r.x)) * smoothstep(0.42, 0.55, y) *
              smoothstep(1.0, 0.85, y);
  c += box * mix(1.6, 2.2, u_dark);

  float stripL = smoothstep(0.1, 0.03, abs(r.x + 0.78)) * smoothstep(-0.35, -0.1, y) * smoothstep(0.8, 0.5, y);
  float stripR = smoothstep(0.08, 0.02, abs(r.x - 0.72)) * smoothstep(-0.3, -0.05, y) * smoothstep(0.75, 0.45, y);
  c += stripL * vec3(1.25, 1.1, 0.95) * mix(1.0, 1.5, u_dark);
  c += stripR * vec3(0.9, 1.05, 1.3) * mix(0.8, 1.3, u_dark);

  float card = smoothstep(0.7, 0.2, abs(r.x)) * smoothstep(-0.95, -0.7, y) * smoothstep(-0.4, -0.65, y);
  c += card * mix(0.35, 0.18, u_dark);
  return c;
}

vec3 tonemap(vec3 x) {
  x = max(x, 0.0);
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

vec3 linearToSrgb(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  vec3 lo = c * 12.92;
  vec3 hi = 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055;
  return mix(lo, hi, step(vec3(0.0031308), c));
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  float px = 1.0 / u_resolution.y;
  vec2 p = rotate((frag - 0.5 * u_resolution) * px, TILT);
  vec2 m = rotate((u_mouse - 0.5) * u_resolution * px, TILT);
  float t = u_time;

  vec3 L = normalize(vec3(u_light, 0.85));
  float count = u_count;
  float spread = mix(0.0, 0.3, clamp((count - 1.0) / 4.0, 0.0, 1.0)) + 0.08 * step(1.5, count);
  float baseWidth = mix(0.13, 0.075, clamp((count - 1.0) / 4.0, 0.0, 1.0));

  vec3 col = vec3(0.0);
  float alpha = 0.0;

  for (int i = 0; i < 5; i++) {
    float k = float(i);
    if (k >= count) break;
    float f = count > 1.0 ? k / (count - 1.0) : 0.5;
    float lane = (f - 0.5) * spread;
    float tk = t * mix(0.82, 1.0, f);

    float x = p.x;
    float e = 0.004;
    float c = spine(x, k, lane, tk, m);
    float slope = (spine(x + e, k, lane, tk, m) - spine(x - e, k, lane, tk, m)) / (2.0 * e);
    float stretch = inversesqrt(1.0 + slope * slope);
    float d = (p.y - c) * stretch;

    float theta = 1.5 * x + 0.45 * tk + 1.7 * k + 0.55 * sin(0.7 * x - 0.3 * tk + k);
    float ct = cos(theta);
    float st = sin(theta);
    float hw = baseWidth * (0.82 + 0.22 * sin(0.9 * x + 0.35 * tk + 2.3 * k));
    float proj = hw * max(abs(ct), 0.035);

    float sd = d + 0.045;
    float shadowW = proj + 0.05;
    float shadow = (1.0 - smoothstep(0.35, 1.0, abs(sd) / shadowW)) * mix(0.2, 0.32, u_dark);
    col *= 1.0 - shadow;
    alpha = alpha + shadow * (1.0 - alpha);

    float v = d / (ct >= 0.0 ? proj : -proj);
    float aa = 1.2 * px / proj;
    float cover = 1.0 - smoothstep(1.0 - aa, 1.0 + aa, abs(v));
    if (cover <= 0.0) continue;

    vec3 T = normalize(vec3(1.0, slope, 0.0));
    vec3 N2 = normalize(vec3(-slope, 1.0, 0.0));
    vec3 B = ct * N2 + st * vec3(0.0, 0.0, 1.0);
    vec3 n = -st * N2 + ct * vec3(0.0, 0.0, 1.0);

    float roll = v * 0.45 + v * v * v * 0.5;
    float ripple = sin(x * 13.0 - tk * 2.2 + k * 3.1) * 0.06 + sin(x * 31.0 + tk * 1.3 + k) * 0.015;
    float grain = lines(v * 34.0 + k * 17.0, k) - 0.5;
    n = normalize(n + B * (roll + grain * 0.015) + T * ripple);
    float edge = smoothstep(0.14, 0.03, abs(ct));
    vec3 rim = B * (st >= 0.0 ? 1.0 : -1.0) + vec3(0.0, 0.2, 0.0);
    n = normalize(mix(n, normalize(rim), edge));
    float back = step(n.z, 0.0);
    n *= 1.0 - 2.0 * back;

    vec3 r = reflect(vec3(0.0, 0.0, -1.0), n);
    vec3 env = studio(r, t);

    float facing = clamp(n.z, 0.0, 1.0);
    vec3 F = u_f0 + (1.0 - u_f0) * pow(1.0 - facing, 5.0);

    float film = 0.5 + 0.5 * sin(x * 1.6 + v * 0.9 + tk * 0.35 + k * 1.9);
    vec3 rainbow = 0.5 + 0.5 * cos(TAU * (film * 1.6 + facing * 1.1 + vec3(0.0, 0.33, 0.67)));
    rainbow = 0.2 + 0.8 * rainbow;
    rainbow /= max(dot(rainbow, vec3(0.2126, 0.7152, 0.0722)), 0.2);
    float sheen = u_iridescence * (0.45 + 0.55 * (1.0 - facing));
    F *= mix(vec3(1.0), rainbow, sheen);

    float rl = max(dot(r, L), 0.0);
    float spec = pow(rl, 90.0) * 5.0 + pow(rl, 14.0) * 0.55;

    vec3 lit = env * F + spec * F;
    lit *= mix(1.0, 0.72, back) * (0.94 + grain * 0.12);
    lit *= mix(0.86, 1.0, f);
    vec3 rgb = linearToSrgb(tonemap(lit * 1.05));

    col = col * (1.0 - cover) + rgb * cover;
    alpha = alpha * (1.0 - cover) + cover;
  }

  float dither = (hash(frag + fract(t) * 91.0) - 0.5) / 255.0;
  col += dither * alpha;
  alpha = clamp(alpha + dither * step(0.0005, alpha) * 1.5, 0.0, 1.0);
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), alpha);
}
`;

const RIBBONS = 3;
const SPEED = 0.3;
const IRIDESCENCE = 0.12;
// A pixel budget: the shader is per pixel, so this is what keeps it smooth.
const MAX_PIXELS = 1_400_000;
const MAX_PIXELS_PHONE = 900_000;
// Past this mean frame time it draws fewer pixels; at the last step it stands still.
const SLOW_FRAME_MS = 30;
const QUALITY_STEPS = [1, 0.7, 0.5];
const REST_LIGHT = { x: -0.45, y: 0.55 };

const srgbToLinear = (c: number): number => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

/** The site's colour as the metal's reflectance, lifted toward chrome so a dark colour still shines. */
export const metalTint = (hex: string): [number, number, number] => {
  const n = Number.parseInt(hex.replace('#', '').slice(0, 6), 16);
  const rgb = Number.isNaN(n) ? [0.9, 0.9, 0.92] : [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  return rgb.map((c) => srgbToLinear(c) * 0.62 + 0.38 * 0.9) as [number, number, number];
};

const compile = (gl: WebGLRenderingContext, type: number, source: string) => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
};

interface MetalRibbonsProps {
  color: string;
  dark: boolean;
  still: boolean;
  /** Which side the words stand on: the ribbons fade out under them. */
  rtl: boolean;
}

/**
 * LT-531: 'metal' (industrial's own): liquid metal ribbons in the site's colour,
 * twisting through a studio light rig, with a key light that follows the pointer.
 * This file is its own chunk, loaded only by a site that shows it. A per-pixel
 * shader is what hurts an old phone, so it holds a pixel budget, watches its own
 * frame times and steps down, and at the last step (or held still, or with no
 * real GPU) it stands as one finished frame. It sleeps off-screen and in a hidden tab.
 */
const MetalRibbons: React.FC<MetalRibbonsProps> = ({ color, dark, still, rtl }) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, failIfMajorPerformanceCaveat: true });
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

    const u = (name: string) => gl.getUniformLocation(program, name);
    const uResolution = u('u_resolution');
    const uTime = u('u_time');
    const uPull = u('u_pull');
    const uMouse = u('u_mouse');
    const uLight = u('u_light');
    gl.uniform1f(u('u_count'), RIBBONS);
    gl.uniform1f(u('u_iridescence'), IRIDESCENCE);
    gl.uniform1f(u('u_dark'), dark ? 1 : 0);
    gl.uniform3fv(u('u_f0'), metalTint(color));

    const slow = lowEnd();
    const hover = window.matchMedia('(hover: hover)').matches;
    let quality = slow ? 1 : 0;
    let raf = 0;
    let seen = true;
    let frozen = still;
    let clock = 11;
    let last = 0;
    let frames = 0;
    let spent = 0;
    const mouse = { x: 0.5, y: 0.5 };
    const target = { x: 0.5, y: 0.5 };
    const light = { ...REST_LIGHT };
    const lightTarget = { ...REST_LIGHT };
    let pull = 0;
    let pullTarget = 0;

    const resize = () => {
      const host = canvas.parentElement;
      if (!host) return;
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (w <= 0 || h <= 0) return;
      const budget = (w < 768 ? MAX_PIXELS_PHONE : MAX_PIXELS) * QUALITY_STEPS[quality] * QUALITY_STEPS[quality];
      const ratio = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(budget / (w * h)));
      canvas.width = Math.max(1, Math.floor(w * ratio));
      canvas.height = Math.max(1, Math.floor(h * ratio));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const paint = () => {
      gl.uniform2f(uResolution, canvas.width, canvas.height);
      gl.uniform1f(uTime, clock);
      gl.uniform1f(uPull, pull);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.uniform2f(uLight, light.x, light.y);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    const tick = (now: number) => {
      raf = 0;
      if (!seen || document.hidden || frozen) return;
      const ms = now - last;
      last = now;
      const dt = Math.min(0.05, ms / 1000);
      clock += dt * SPEED * 3;
      const ease = (rate: number) => 1 - Math.exp(-dt * rate);
      mouse.x += (target.x - mouse.x) * ease(3);
      mouse.y += (target.y - mouse.y) * ease(3);
      light.x += (lightTarget.x - light.x) * ease(5);
      light.y += (lightTarget.y - light.y) * ease(5);
      pull += (pullTarget - pull) * ease(2.5);
      paint();
      frames += 1;
      spent += ms;
      if (frames === 40) {
        if (spent / frames > SLOW_FRAME_MS) {
          if (quality < QUALITY_STEPS.length - 1) {
            quality += 1;
            resize();
          } else {
            frozen = true;
            paint();
            return;
          }
        }
        frames = 0;
        spent = 0;
      }
      raf = requestAnimationFrame(tick);
    };
    const wake = () => {
      if (raf || frozen) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };

    resize();
    paint();

    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => { resize(); paint(); });
    if (canvas.parentElement) ro?.observe(canvas.parentElement);
    const io = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      if (seen) wake();
    });
    io?.observe(canvas);
    const onVisible = () => wake();
    document.addEventListener('visibilitychange', onVisible);
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      const x = (e.clientX - r.left) / r.width;
      const y = 1 - (e.clientY - r.top) / r.height;
      const inside = x >= 0 && x <= 1 && y >= 0 && y <= 1;
      pullTarget = inside ? 1 : 0;
      if (inside) {
        target.x = x;
        target.y = y;
        lightTarget.x = (x * 2 - 1) * 0.9;
        lightTarget.y = (y * 2 - 1) * 0.9;
      } else {
        lightTarget.x = REST_LIGHT.x;
        lightTarget.y = REST_LIGHT.y;
      }
    };
    if (hover) window.addEventListener('pointermove', onMove, { passive: true });
    wake();

    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      io?.disconnect();
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pointermove', onMove);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buffer);
    };
  }, [color, dark, still]);

  const mask = `linear-gradient(${rtl ? 'to right' : 'to left'}, #000 35%, transparent 85%)`;
  return <canvas ref={ref} className="absolute inset-0 w-full h-full pointer-events-none" style={{ maskImage: mask, WebkitMaskImage: mask }} aria-hidden="true" />;
};

export default MetalRibbons;
