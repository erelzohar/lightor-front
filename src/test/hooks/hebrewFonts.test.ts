import { describe, it, expect } from 'vitest';
import { RTL_BODY_STACK, RTL_HEADING_STACK } from '../../hooks/useTheme';

const face = (stack: string) => stack.split(',')[0].trim().replace(/'/g, '');

/** LT-320: a font picked in the editor must change a Hebrew site's headings. */
describe('Hebrew faces of the font tokens', () => {
  it('gives every heading font its own Hebrew face', () => {
    const faces = Object.values(RTL_HEADING_STACK).map(face);
    expect(new Set(faces).size).toBe(faces.length);
  });

  it('shares a body face only for the display-only families', () => {
    const byFace = new Map<string, string[]>();
    for (const [family, stack] of Object.entries(RTL_BODY_STACK)) byFace.set(face(stack), [...(byFace.get(face(stack)) ?? []), family]);
    const shared = [...byFace.values()].filter((families) => families.length > 1);
    expect(shared).toEqual([['inter', 'anton', 'secularone']]);
  });
});
