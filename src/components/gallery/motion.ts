/**
 * LT-525: the arithmetic of the three moving galleries (Clothesline, CurveReel,
 * TiltCascade). Pure, so it is tested without a browser.
 */
export const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v));

export const pad2 = (n: number): string => (n < 10 ? `0${n}` : String(n));

/** One semi-implicit Euler step of a spring, sub-stepped so a long frame cannot blow it up. */
export const spring = (x: number, v: number, target: number, omega: number, zeta: number, dt: number): [number, number] => {
  const steps = Math.max(1, Math.ceil(dt * 240));
  const h = dt / steps;
  for (let k = 0; k < steps; k++) {
    v += (-omega * omega * (x - target) - 2 * zeta * omega * v) * h;
    x += v * h;
  }
  return [x, v];
};

// ── the clothesline ─────────────────────────────────────────────────────

/** Height of a string sagging by `sag` between (0, y0) and (w, y0), at x. */
export const stringY = (x: number, w: number, y0: number, sag: number): number => {
  const t = clamp(x / w, 0, 1);
  return y0 + 4 * sag * t * (1 - t);
};

/**
 * One step of a print's swing. `lineVel` is its speed on screen (px/s, + is
 * rightwards): it lags behind the motion, gravity pulls it back, air damps it.
 */
export const swingStep = (a: number, w: number, lineVel: number, dt: number): [number, number] => {
  const nw = w + (-38 * a - 4.2 * w + lineVel * 0.0034) * dt;
  return [clamp(a + nw * dt, -0.6, 0.6), nw];
};

/** The print nearest the centre for a line offset. */
export const nearestAt = (off: number, spacing: number, n: number): number =>
  clamp(Math.round(off / spacing), 0, Math.max(0, n - 1));

// ── the cascade ─────────────────────────────────────────────────────────

/** Scale of a card `d` slides from the front: 1 in front, `min` from one step out. */
export const scaleAt = (d: number, min: number): number => 1 - (1 - min) * Math.min(Math.abs(d), 1);

/** Past either end the line still follows a drag, at a third of the speed. */
export const rubber = (pos: number, n: number): number => {
  if (pos < 0) return pos / 3;
  if (pos > n - 1) return n - 1 + (pos - (n - 1)) / 3;
  return pos;
};

/**
 * Where a released drag comes to rest. `velocity` is in slides per second: a
 * flick carries a fifth of a second of it, at most three slides past the finger.
 */
export const releaseTarget = (pos: number, velocity: number, n: number): number => {
  const here = Math.round(pos);
  return clamp(clamp(Math.round(pos + velocity * 0.2), here - 3, here + 3), 0, n - 1);
};

// ── the curve ───────────────────────────────────────────────────────────

// Camera distance from the screen, as a multiple of the cylinder's radius. Just
// past the axis, so the ends come right up to the lens and swell.
const CAMERA = 1.6;
// A tile is never wider than this share of the band, so a phone still shows its neighbours.
const MAX_WIDTH = 0.55;

const degrees = (rad: number): number => (rad * 180) / Math.PI;

export interface CurveLayout {
  /** Tile height, px. */
  tile: number;
  /** Cylinder radius, px. */
  radius: number;
  /** Perspective distance, px. */
  camera: number;
  /** The arc one tile-height spans, degrees. */
  unit: number;
  /** How far round the loop's ends sit, degrees. */
  sweep: number;
  /** Tiles on the loop: a whole number, so the gap never stretches. */
  columns: number;
}

/**
 * Lays the row on the cylinder. The radius puts the band's edge `bend` degrees
 * round the arc as seen through the camera; the loop reaches past the angle
 * where a whole tile is off-screen, so a tile only ever wraps out of sight.
 */
export const measureCurve = (width: number, height: number, tileShare: number, aspect: number, gap: number, bend: number): CurveLayout | null => {
  const rad = (clamp(bend, 5, 85) * Math.PI) / 180;
  const tile = Math.min(tileShare * height, (MAX_WIDTH * width) / aspect);
  const radius = (width * (CAMERA - 1 + Math.cos(rad))) / (2 * CAMERA * Math.sin(rad));
  if (!(tile > 0) || !(radius > 0)) return null;
  const unit = degrees(tile / radius);
  const pitch = (aspect + gap) * unit;
  const limit = degrees(rad) + (aspect * unit) / 2;
  // Capped so a band squeezed to a sliver cannot mount thousands of tiles.
  const columns = Math.min(60, Math.max(2, Math.ceil((2 * limit) / pitch)));
  return { tile, radius, camera: radius * CAMERA, unit, sweep: (columns * pitch) / 2, columns };
};

/** The box an image fills a `tw` by `th` tile with, cropped like object-fit: cover. */
export const coverBox = (nw: number, nh: number, tw: number, th: number): { w: number; h: number; x: number; y: number } => {
  const s = Math.max(tw / nw, th / nh);
  return { w: nw * s, h: nh * s, x: (tw - nw * s) / 2, y: (th - nh * s) / 2 };
};
