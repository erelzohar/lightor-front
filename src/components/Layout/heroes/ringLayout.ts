/**
 * LT-696: the words round a ring, each letter stood at its own angle.
 *
 * A browser can lay text along a path by itself (SVG `textPath`), but iPhone's
 * engine places right-to-left letters along it in the order they are typed:
 * Hebrew came out backwards on every iPhone browser, right in Chrome. So the
 * ring does not ask the browser: the order the letters are seen in is worked
 * out here, and every letter gets its own place.
 *
 * - A letter is one piece. In a script whose letters join (Arabic), a whole
 *   word is one piece, drawn by the browser as it draws any word.
 * - Right-to-left runs are turned round; Latin words and numbers inside them
 *   keep their own order.
 * - The pieces share the full turn by their rough widths, so the words always
 *   go exactly once round. A name too long for the ring gets smaller letters.
 */

export interface RingPiece {
  text: string;
  /** Degrees clockwise from the top of the ring. */
  angle: number;
  /** The direction the piece itself is drawn in (a bracket mirrors by it). */
  rtl: boolean;
}

export interface RingLayout {
  pieces: RingPiece[];
  fontSize: number;
}

type Dir = 'L' | 'R' | 'N';

/** The ring's letter size, and how many average letters go round at that size. */
const FONT = 9;
const ROOM = 39;
const SMALLEST = 4.5;

const RTL = /[֐-ࣿיִ-﷿ﹰ-﻿]/;
const HEBREW = /[֐-׿יִ-ﭏ]/;
const STRONG = /[\p{L}\p{N}]/u;
const MARK = /\p{M}/u;
const SPACE = /^\s+$/;

const joins = (letter: string): boolean => RTL.test(letter) && !HEBREW.test(letter);

type Segmenter = { segment: (text: string) => Iterable<{ segment: string }> };

/** What a reader counts as one letter: a letter with its marks, a whole emoji. */
const lettersOf = (text: string): string[] => {
  const Maker = (Intl as unknown as { Segmenter?: new (locale?: string, options?: { granularity: 'grapheme' }) => Segmenter }).Segmenter;
  if (Maker) return Array.from(new Maker(undefined, { granularity: 'grapheme' }).segment(text), (part) => part.segment);
  return text.match(/\P{M}\p{M}*/gu) ?? [];
};

/** Letters; a run of joining letters stays one piece. */
const piecesOf = (text: string): string[] => {
  const pieces: string[] = [];
  let joining = false;
  for (const letter of lettersOf(text)) {
    const joined = joins(letter);
    if (joined && joining) pieces[pieces.length - 1] += letter;
    else pieces.push(letter);
    joining = joined;
  }
  return pieces;
};

/** Rough widths, in average letters. The font is the site's own, so these are classes, not measures. */
const widthOf = (piece: string): number => {
  if (SPACE.test(piece)) return 0.45;
  if (joins(piece)) return Math.max(1, Array.from(piece).filter((c) => !MARK.test(c)).length * 0.72);
  const code = piece.codePointAt(0) ?? 0;
  if (code >= 0x2e80) return 1.6;
  if (/^[יוןז׳״'’"`.,:;!|iljI1()[\]-]/.test(piece)) return 0.55;
  if (/^[גנרךףץ•·]/.test(piece)) return 0.8;
  if (/^[mwMW@%&]/.test(piece)) return 1.4;
  if (/^[A-Z0-9]/.test(piece)) return 1.1;
  if (/^[a-z]/.test(piece)) return 0.9;
  return 1;
};

const dirOf = (piece: string): Dir => (RTL.test(piece) ? 'R' : STRONG.test(piece) ? 'L' : 'N');

/** Spaces and signs take the side of the letters round them; between two sides, the line's own. */
const settled = (dirs: Dir[], base: 'L' | 'R'): Array<'L' | 'R'> => {
  const strongFrom = (from: number, step: 1 | -1): 'L' | 'R' => {
    for (let i = from; i >= 0 && i < dirs.length; i += step) if (dirs[i] !== 'N') return dirs[i] as 'L' | 'R';
    return base;
  };
  return dirs.map((dir, i) => {
    if (dir !== 'N') return dir;
    const before = strongFrom(i - 1, -1);
    return before === strongFrom(i + 1, 1) ? before : base;
  });
};

/** The pieces in the order they are seen, left to right. */
const seen = <T,>(items: T[], dirs: Array<'L' | 'R'>, base: 'L' | 'R'): T[] => {
  const runs: Array<{ dir: 'L' | 'R'; items: T[] }> = [];
  items.forEach((item, i) => {
    const last = runs[runs.length - 1];
    if (last && last.dir === dirs[i]) last.items.push(item);
    else runs.push({ dir: dirs[i], items: [item] });
  });
  if (base === 'R') runs.reverse();
  return runs.flatMap((run) => (run.dir === 'R' ? [...run.items].reverse() : run.items));
};

export function ringLayout(text: string): RingLayout {
  const raw = piecesOf(text);
  if (!raw.length) return { pieces: [], fontSize: FONT };
  const dirs = raw.map(dirOf);
  const base = (dirs.find((dir) => dir !== 'N') ?? 'L') as 'L' | 'R';
  const sides = settled(dirs, base);
  const order = seen(raw.map((piece, i) => ({ piece, rtl: sides[i] === 'R' })), sides, base);

  const widths = order.map(({ piece }) => widthOf(piece));
  const total = widths.reduce((sum, width) => sum + width, 0);
  const pieces: RingPiece[] = [];
  let at = 0;
  order.forEach(({ piece, rtl }, i) => {
    const middle = at + widths[i] / 2;
    at += widths[i];
    // A space only takes room.
    if (!SPACE.test(piece)) pieces.push({ text: piece, angle: Math.round((middle / total) * 36000) / 100, rtl });
  });
  const fontSize = total > ROOM ? Math.max(SMALLEST, Math.round(((FONT * ROOM) / total) * 100) / 100) : FONT;
  return { pieces, fontSize };
}
