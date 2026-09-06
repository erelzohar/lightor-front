import { describe, it, expect } from 'vitest';
import { revealVariants } from '../../services/reveal';

describe('revealVariants (LT-126)', () => {
  const legacy = { container: { hidden: { opacity: 0 } }, item: { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } } };

  it('returns the component\'s own variants for rise and for an unset style (legacy byte-stable)', () => {
    expect(revealVariants(undefined, legacy)).toBe(legacy);
    expect(revealVariants('rise', legacy)).toBe(legacy);
  });

  it('gives every other profile a distinct entrance', () => {
    const fade = revealVariants('fade', legacy).item as { hidden: Record<string, unknown> };
    const slide = revealVariants('slide', legacy).item as { hidden: Record<string, unknown> };
    const zoom = revealVariants('zoom', legacy).item as { hidden: Record<string, unknown> };
    expect(fade.hidden).toEqual({ opacity: 0 });
    expect(slide.hidden.x).toBe(-48);
    expect(zoom.hidden.scale).toBe(0.9);
  });

  it('slides from the reading start in RTL', () => {
    document.documentElement.dir = 'rtl';
    const slide = revealVariants('slide', legacy).item as { hidden: Record<string, unknown> };
    expect(slide.hidden.x).toBe(48);
    document.documentElement.dir = '';
  });
});
