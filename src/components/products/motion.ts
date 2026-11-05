/**
 * LT-540: the geometry of the moving product layouts. Pure, so it is tested
 * without a browser. The belt is a stadium loop seen from above and tilted:
 * `u` is the distance along it, the front lane running right to left.
 */
export const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v));

const SPACING = 1.35;
const CURVE = 0.95;
const BAND = 1.22;
const TILT = 0.8;

export interface BeltGeo {
  width: number;
  height: number;
  /** Plate diameter. */
  d: number;
  /** Radius of the curves. */
  r: number;
  /** Length of a straight. */
  s: number;
  /** Length of the loop. */
  l: number;
  n: number;
  /** Scale of the far lane. */
  far: number;
  cx: number;
  ym: number;
  a: number;
  b: number;
  band: number;
  side: number;
}

interface Point { x: number; z: number; nx: number; nz: number }

export const along = (g: Pick<BeltGeo, 's' | 'r' | 'l'>, u: number): Point => {
  const { s, r, l } = g;
  let t = ((u % l) + l) % l;
  if (t < s) return { x: s / 2 - t, z: r, nx: 0, nz: 1 };
  t -= s;
  const arc = Math.PI * r;
  if (t < arc) {
    const f = t / r;
    return { x: -s / 2 - r * Math.sin(f), z: r * Math.cos(f), nx: -Math.sin(f), nz: Math.cos(f) };
  }
  t -= arc;
  if (t < s) return { x: -s / 2 + t, z: -r, nx: 0, nz: -1 };
  t -= s;
  const f = Math.min(Math.PI, t / r);
  return { x: s / 2 + r * Math.sin(f), z: -r * Math.cos(f), nx: Math.sin(f), nz: -Math.cos(f) };
};

/** The far lane shrinks to `far` and depth is foreshortened by the tilt. */
export const project = (g: Pick<BeltGeo, 'a' | 'b' | 'cx' | 'ym'>, x: number, z: number): { x: number; y: number; k: number } => {
  const k = g.a + g.b * z;
  return { x: g.cx + x * k, y: g.ym + TILT * (g.a * z + (g.b * z * z) / 2), k };
};

export const makeBelt = (width: number, n: number, d: number, far: number): BeltGeo => {
  const count = Math.max(1, n);
  const l = count * SPACING * d;
  const r = Math.min(CURVE * d, l / (2 * Math.PI));
  const s = Math.max(0, (l - 2 * Math.PI * r) / 2);
  const g: BeltGeo = {
    width, height: 0, d, r, s, l, n: count, far, cx: width / 2, ym: 0,
    a: (1 + far) / 2, b: (1 - far) / (2 * r), band: BAND * d, side: Math.max(3, d * 0.07),
  };
  let top = Infinity;
  let bottom = -Infinity;
  for (let j = 0; j < 120; j++) {
    const p = along(g, (j / 120) * l);
    const rim = project(g, p.x + (p.nx * g.band) / 2, p.z + (p.nz * g.band) / 2);
    const plate = project(g, p.x, p.z);
    const half = (plate.k * d) / 2;
    top = Math.min(top, rim.y, plate.y - half - 14);
    bottom = Math.max(bottom, rim.y + g.side + d * 0.06, plate.y + half + d * 0.08);
  }
  g.ym = Math.ceil(-top) + 2;
  g.height = Math.ceil(bottom - top) + 4;
  return g;
};

const halfSpan = (g: BeltGeo): number => {
  let span = 0;
  for (let j = 0; j < 120; j++) {
    const p = along(g, (j / 120) * g.l);
    const rim = project(g, p.x + (p.nx * g.band) / 2, p.z + (p.nz * g.band) / 2);
    const plate = project(g, p.x, p.z);
    span = Math.max(span, Math.abs(rim.x - g.cx) + 3, Math.abs(plate.x - g.cx) + (plate.k * g.d) / 2);
  }
  return span;
};

/** The largest belt that fits the width; a phone shows the middle of a larger one. */
export const fitBelt = (width: number, n: number): BeltGeo => {
  const far = width < 480 ? 0.6 : 0.68;
  const span = halfSpan(makeBelt(1000, n, 100, far)) / 100;
  const cap = width >= 1024 ? 150 : clamp(width * 0.143, 96, 150);
  const fit = (width - 8) / (2 * span);
  return makeBelt(width, n, Math.round(clamp(fit, Math.min(96, cap), cap)), far);
};

/** An edge of the band as an SVG path, `offset` off the centre line. */
export const edgePath = (g: BeltGeo, offset: number): string => {
  let d = '';
  for (let j = 0; j < 168; j++) {
    const p = along(g, (j / 168) * g.l);
    const q = project(g, p.x + p.nx * offset, p.z + p.nz * offset);
    d += `${j ? 'L' : 'M'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
  }
  return `${d}Z`;
};

/**
 * One lap of a plate as animation frames: transforms only, so the browser's
 * compositor runs the belt and no frame loop does. On right-to-left pages it
 * turns the other way.
 */
export const beltFrames = (g: BeltGeo, rtl: boolean, steps = 72): { transform: string }[] => {
  const frames: { transform: string }[] = [];
  for (let j = 0; j <= steps; j++) {
    const p = along(g, (j / steps) * g.l);
    const q = project(g, p.x, p.z);
    const x = rtl ? g.width - q.x : q.x;
    frames.push({ transform: `translate3d(${(x - g.d / 2).toFixed(2)}px,${(q.y - g.d / 2).toFixed(2)}px,0) scale(${q.k.toFixed(4)})` });
  }
  return frames;
};

/** Where on the loop (0..1) the middle of the front lane is. */
export const frontOf = (g: Pick<BeltGeo, 's' | 'l'>): number => g.s / 2 / g.l;

const wrap = (v: number): number => ((v % 1) + 1) % 1;

/** The plate nearest the front at `phase` (0..1 of a lap); plate i starts `i/n` behind plate 0. */
export const plateAtFront = (phase: number, n: number, front: number): number => {
  let best = 0;
  let distance = Infinity;
  for (let i = 0; i < n; i++) {
    const at = wrap(phase - i / n);
    const gap = Math.min(wrap(at - front), wrap(front - at));
    if (gap < distance) { distance = gap; best = i; }
  }
  return best;
};

/** The shortest move (in laps, either way) that brings plate i to the front. */
export const lapsToFront = (phase: number, i: number, n: number, front: number): number => {
  const gap = wrap(front - wrap(phase - i / n));
  return gap > 0.5 ? gap - 1 : gap;
};

// ── the rail ────────────────────────────────────────────────────────────

/** Width over height of a hanging piece. */
export const RAIL_ASPECT = 200 / 310;
/** The angle a piece rests at, seen nearly edge-on. */
export const RAIL_REST = -70;
const RAIL_GAP = 0.035;
const REST_WIDTH = 0.4;
const FRONT_WIDTH = 0.94;

/** The room a piece takes on the rail: narrow at rest, wide when it faces front. */
export const railFoot = (h: number, front: boolean): number => h * RAIL_ASPECT * (front ? FRONT_WIDTH : REST_WIDTH) + h * RAIL_GAP;

/** Below this height the rail gives way to one piece at a time. */
const RAIL_MIN_H = 200;

export const fitRail = (width: number, n: number): { h: number; carousel: boolean } => {
  const fit = (width - 24) / (n * railFoot(1, false) + railFoot(1, true) - railFoot(1, false));
  if (fit < RAIL_MIN_H) return { h: Math.round(Math.min(340, Math.max(220, width * 0.86))), carousel: true };
  return { h: Math.round(Math.min(400, fit)), carousel: false };
};

/** The centre of each piece on the rail, with `front` facing the visitor. */
export const railTargets = (n: number, h: number, width: number, carousel: boolean, front: number | null): number[] => {
  const feet = Array.from({ length: n }, (_, i) => railFoot(h, i === front));
  if (carousel) {
    const centre = front ?? 0;
    const xs = feet.map(() => 0);
    xs[centre] = width / 2;
    for (let i = centre + 1; i < n; i++) xs[i] = xs[i - 1] + (feet[i - 1] + feet[i]) / 2;
    for (let i = centre - 1; i >= 0; i--) xs[i] = xs[i + 1] - (feet[i + 1] + feet[i]) / 2;
    return xs;
  }
  const total = feet.reduce((sum, f) => sum + f, 0);
  let cursor = (width - total) / 2;
  return feet.map((f) => { const x = cursor + f / 2; cursor += f; return x; });
};

// ── the coverflow ───────────────────────────────────────────────────────

/** How far card `i` stands from the active one, the short way round the ring. */
export const ringOffset = (i: number, active: number, n: number): number => {
  let o = i - active;
  if (o > n / 2) o -= n;
  if (o < -n / 2) o += n;
  return o;
};

// ── the orbit ───────────────────────────────────────────────────────────

/**
 * LT-583: the orbit (Erel's dish carousel). The plate hangs from a pivot far
 * above it, as `transform-origin` (in the plate's own box, in %); a change
 * swings the plate out round it while the next swings in from the other side.
 */
export const ORBIT_PIVOT = { x: 69, y: -217 };
/** Distance from the pivot to the middle of the band, and the band's width, in % of the plate. */
const ORBIT_R = 265;
const ORBIT_W = 46;
/**
 * Where the band runs, in screen degrees round the pivot (0 = towards the end
 * side, 90 = straight down): from above the title down to the plate, its far
 * end hidden behind the plate (which hangs at about 94).
 */
export const ORBIT_SPAN: [number, number] = [52, 104];
/** The band turns a little with each product, round the same pivot. */
export const ORBIT_TURNS = [0, -4, 4, -5, 2];
export const orbitTurn = (i: number): number => ORBIT_TURNS[((i % ORBIT_TURNS.length) + ORBIT_TURNS.length) % ORBIT_TURNS.length];

/**
 * The pastel band behind the plate: a thick stroke along the plate's orbit,
 * tapering to nothing at both ends. Coordinates in % of the plate, the pivot
 * at 0,0; `flip` mirrors it for right-to-left pages.
 */
export const orbitArc = (flip = false, [a0, a1]: [number, number] = ORBIT_SPAN, steps = 48): string => {
  const outer: string[] = [];
  const inner: string[] = [];
  const sx = flip ? -1 : 1;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = ((a0 + (a1 - a0) * t) * Math.PI) / 180;
    const h = (ORBIT_W / 2) * Math.pow(Math.sin(Math.PI * t), 0.75);
    const c = Math.cos(a);
    const s = Math.sin(a);
    outer.push(`${(sx * c * (ORBIT_R + h)).toFixed(1)} ${(s * (ORBIT_R + h)).toFixed(1)}`);
    inner.push(`${(sx * c * (ORBIT_R - h)).toFixed(1)} ${(s * (ORBIT_R - h)).toFixed(1)}`);
  }
  return `M${outer.join('L')}L${inner.reverse().join('L')}Z`;
};

/** The thin first line and the heavy second of a product's name, split at the word nearest its middle. */
export const twoLines = (name: string): [string, string] => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) return ['', words[0] ?? ''];
  let best = 1;
  let gap = Infinity;
  for (let i = 1; i < words.length; i++) {
    const head = words.slice(0, i).join(' ').length;
    const tail = words.slice(i).join(' ').length;
    if (Math.abs(head - tail) < gap) { gap = Math.abs(head - tail); best = i; }
  }
  return [words.slice(0, best).join(' '), words.slice(best).join(' ')];
};

/** A title line's size in rem: large for a short word, smaller as it grows, never under `min` (it wraps past that). */
export const lineSize = (text: string, max: number, min: number, room: number): number =>
  Math.max(min, Math.min(max, room / Math.max(1, text.length)));
