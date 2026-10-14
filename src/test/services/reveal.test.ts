import { describe, it, expect } from 'vitest';
import { revealVariants } from '../../services/reveal';

describe('revealVariants (LT-126)', () => {
  const legacy = { container: { hidden: { opacity: 0 } }, item: { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } } };

  it('returns the component\'s own variants for rise and for an unset style (the same motion)', () => {
    for (const style of [undefined, 'rise'] as const) {
      const set = revealVariants(style, legacy);
      expect(set.item).toMatchObject(legacy.item);
      expect(set.container).toMatchObject(legacy.container);
    }
  });

  it('gives every other profile a distinct entrance', () => {
    const fade = revealVariants('fade', legacy).item as { hidden: Record<string, unknown> };
    const slide = revealVariants('slide', legacy).item as { hidden: Record<string, unknown> };
    const zoom = revealVariants('zoom', legacy).item as { hidden: Record<string, unknown> };
    expect(fade.hidden).toMatchObject({ opacity: 0, x: 0, y: 0, scale: 1 });
    expect(slide.hidden.x).toBe(-48);
    expect(zoom.hidden.scale).toBe(0.9);
  });

  it('slides from the reading start in RTL', () => {
    document.documentElement.dir = 'rtl';
    const slide = revealVariants('slide', legacy).item as { hidden: Record<string, unknown> };
    expect(slide.hidden.x).toBe(48);
    document.documentElement.dir = '';
  });

  // LT-325: switching style on an open page swaps variants under elements
  // that already took a pose — every state must name every axis.
  it('names every axis in every state, so a switched style leaves no old pose behind', () => {
    for (const style of [undefined, 'rise', 'fade', 'slide', 'zoom'] as const) {
      const { container, item } = revealVariants(style, legacy) as { container: Record<string, Record<string, unknown>>; item: Record<string, Record<string, unknown>> };
      for (const state of [...Object.values(container), ...Object.values(item)]) {
        expect(state).toHaveProperty('x');
        expect(state).toHaveProperty('y');
        expect(state).toHaveProperty('scale');
      }
    }
    // slide, then rise: the element waiting at x 48 goes home.
    const rise = revealVariants('rise', legacy).item as Record<string, Record<string, unknown>>;
    expect(rise.visible).toMatchObject({ x: 0, y: 0, scale: 1, opacity: 1 });
  });
});
