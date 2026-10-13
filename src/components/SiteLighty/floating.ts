/**
 * LT-312: the site's Lighty can be dragged anywhere on screen, as the
 * dashboard's (lightor-dashboard utils/floatingLighty.ts, LT-292). His place
 * is an offset from his home corner (bottom-end), kept per visitor's browser
 * so he stays where they left him; these are the pure rules behind it.
 */

export interface Offset {
  x: number;
  y: number;
}

/** His box where the offset is 0 — the home corner, in viewport px. */
export interface Home {
  left: number;
  top: number;
  width: number;
  height: number;
}

const STORE = 'lighty.siteOffset';
export const EDGE = 8;
/** A press that moves less than this is a tap (it opens the chat), not a drag. */
export const DRAG_START_PX = 6;

/** Keep him whole on screen: any column, from the top margin down to his home line, never lower. */
export function clampOffset(home: Home, x: number, y: number, vw: number, vh: number): Offset {
  const minX = EDGE - home.left;
  const maxX = vw - home.width - EDGE - home.left;
  const minY = EDGE - home.top;
  const maxY = Math.min(0, vh - home.height - EDGE - home.top);
  return {
    x: Math.round(Math.min(Math.max(x, minX), Math.max(minX, maxX))),
    y: Math.round(Math.min(Math.max(y, minY), Math.max(minY, maxY))),
  };
}

export function readOffset(): Offset {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE) ?? 'null') as Partial<Offset> | null;
    if (raw && Number.isFinite(raw.x) && Number.isFinite(raw.y)) return { x: raw.x as number, y: raw.y as number };
  } catch {
    // private mode, cleared storage: he starts at home
  }
  return { x: 0, y: 0 };
}

export function saveOffset(offset: Offset): void {
  try {
    localStorage.setItem(STORE, JSON.stringify(offset));
  } catch {
    // a nicety; nothing depends on it
  }
}
