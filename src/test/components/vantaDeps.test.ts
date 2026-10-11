import { describe, it, expect, beforeEach } from 'vitest';
import indexHtml from '../../../index.html?raw';
import { loadVantaDeps, vantaScriptsFor, THREE_SRC, P5_SRC } from '../../components/Layout/vantaDeps';
import { resolveVantaType } from '../../components/Layout/Hero';

const tagsFor = (src: string) =>
  Array.from(document.head.querySelectorAll('script')).filter((s) => s.src === src);

/** LT-240 — three.js / p5 load on demand, not as parser-blocking head scripts. */
describe('vantaDeps', () => {
  beforeEach(() => {
    document.head.querySelectorAll('script').forEach((s) => s.remove());
  });

  it('p5 only for the p5-drawn effects; THREE for every effect', () => {
    for (const t of ['clouds', 'fog', 'clouds2', 'birds', 'net']) {
      expect(vantaScriptsFor(t)).toEqual([THREE_SRC]);
    }
    for (const t of ['topology', 'trunk']) {
      expect(vantaScriptsFor(t)).toEqual([THREE_SRC, P5_SRC]);
    }
  });

  it('keeps the versions Vanta 0.5.24 works with', () => {
    expect(THREE_SRC).toContain('/three.js/r134/');
    expect(P5_SRC).toContain('/p5@1.9.3/');
  });

  it('every effect the hero can resolve to has its scripts listed', () => {
    for (const t of ['gradient', 'clouds', 'fog', 'clouds2', 'topology', 'trunk', 'birds', 'net', undefined]) {
      expect(vantaScriptsFor(resolveVantaType(t))).toContain(THREE_SRC);
    }
  });

  it('injects each script once and resolves when it loads', async () => {
    const first = loadVantaDeps('topology');
    const again = loadVantaDeps('trunk');
    expect(tagsFor(THREE_SRC)).toHaveLength(1);
    expect(tagsFor(P5_SRC)).toHaveLength(1);
    tagsFor(THREE_SRC)[0].dispatchEvent(new Event('load'));
    tagsFor(P5_SRC)[0].dispatchEvent(new Event('load'));
    await expect(first).resolves.toBeUndefined();
    await expect(again).resolves.toBeUndefined();
    // Already loaded: no new tag.
    await loadVantaDeps('fog');
    expect(tagsFor(THREE_SRC)).toHaveLength(1);
  });

  it('a failed load rejects and is retried on the next call', async () => {
    // A fresh module so the memo from the previous test is gone.
    const mod = await import('../../components/Layout/vantaDeps?retry' as string) as typeof import('../../components/Layout/vantaDeps');
    const failed = mod.loadVantaDeps('fog');
    tagsFor(THREE_SRC)[0].dispatchEvent(new Event('error'));
    await expect(failed).rejects.toThrow(/failed to load/);
    expect(tagsFor(THREE_SRC)).toHaveLength(0);
    void mod.loadVantaDeps('fog');
    expect(tagsFor(THREE_SRC)).toHaveLength(1);
  });

  it('index.html no longer loads them in the head', () => {
    expect(indexHtml).not.toMatch(/three(\.min)?\.js|p5(\.min)?\.js/);
  });
});
