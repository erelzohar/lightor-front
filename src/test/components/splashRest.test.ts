import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import postcss, { type AtRule, type Rule } from 'postcss';

/**
 * LT-669 - festive's splash button (LT-605) left a short dash beside itself
 * at rest. Its 12 lines were "hidden" by their dash alone (60 60, offset 60,
 * pathLength 60), but on a frame stretched over the button with a
 * non-scaling stroke Chrome measures the dash a little off, so the round cap
 * of a line's tip showed (5x3px, 62px right of a 238x52 button at 390 wide),
 * and the splash's last dots stayed while the pointer rested on it. Now the
 * lines are unseen at rest, while each waits its turn, and once they end.
 */
// Read from disk: under vitest a CSS import (even ?raw) comes back empty.
const root = postcss.parse(fs.readFileSync(path.resolve(__dirname, '../../components/ui/SplashButton.css'), 'utf8'));

const decls = (node: Rule | AtRule) => {
  const out: Record<string, string> = {};
  node.walkDecls((d) => { out[d.prop] = d.value; });
  return out;
};
const rules = (selector: RegExp) => {
  const found: Rule[] = [];
  root.walkRules((r) => {
    const inKeyframes = r.parent?.type === 'atrule' && (r.parent as AtRule).name === 'keyframes';
    if (!inKeyframes && selector.test(r.selector)) found.push(r);
  });
  return found;
};

describe("festive's splash lines draw nothing unless splashing (LT-669)", () => {
  it('at rest a line is see-through, whatever its dash', () => {
    const rest = rules(/^\.lt-splash-burst path$/);
    expect(rest).toHaveLength(1);
    expect(decls(rest[0])).toMatchObject({ opacity: '0', 'stroke-dasharray': '60 60', 'stroke-dashoffset': '60' });
  });

  it('the splash shows the lines while they run out and fades them as they end', () => {
    let frames: AtRule | undefined;
    root.walkAtRules('keyframes', (a) => { if (a.params === 'lt-splash-out') frames = a; });
    expect(frames).toBeDefined();
    const steps = (frames!.nodes as Rule[]).map((r) => ({ at: r.selector, ...decls(r) }));
    expect(steps[0]).toMatchObject({ at: '0%, 60%', opacity: '1' });
    expect(steps[steps.length - 1]).toMatchObject({ at: 'to', opacity: '0', 'stroke-dasharray': '2 60', 'stroke-dashoffset': '-60' });
  });

  it('pointed at, the lines splash, and keep the rest look while each waits its turn (forwards, not both)', () => {
    const hover = rules(/:hover \.lt-splash-burst path$/);
    expect(hover).toHaveLength(1);
    const { animation } = decls(hover[0]);
    expect(animation).toMatch(/^lt-splash-out\b/);
    expect(animation).toMatch(/\bforwards$/);
    expect(animation).not.toMatch(/\b(both|backwards)\b/);
    expect((hover[0].parent as AtRule).params).toBe('(hover: hover)');
  });

  it('less motion asked for: no animation, so the lines stay at their unseen rest', () => {
    let reduced: AtRule | undefined;
    root.walkAtRules('media', (a) => { if (a.params.includes('prefers-reduced-motion: reduce')) reduced = a; });
    expect(reduced?.toString()).toMatch(/animation:\s*none !important/);
  });
});
