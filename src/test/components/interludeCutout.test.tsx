import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import Interlude from '../../components/Layout/Interlude';

const { cut } = vi.hoisted(() => ({ cut: { on: false } }));
vi.mock('../../contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'he' }) }));
vi.mock('../../utils/cutout', async (orig) => ({ ...(await orig<typeof import('../../utils/cutout')>()), useCutout: () => cut.on }));

/** LT-317 — a round logo beside the statement shows whole, a photo still fills its half. */
describe('the interlude, with a cut-out', () => {
  it('fills its half with a photo', () => {
    cut.on = false;
    const { container } = render(<Interlude image="photo.jpg" statement="We care" variant={1} />);
    const img = container.querySelector('img')!;
    expect(img.className).toContain('object-cover');
    expect(img).not.toHaveAttribute('data-cutout');
  });

  it('shows a round logo whole, its shadow on its own outline', () => {
    cut.on = true;
    const { container } = render(<Interlude image="logo.webp" statement="We care" variant={1} />);
    const img = container.querySelector('img')!;
    expect(img.className).toContain('object-contain');
    expect(img.className).toContain('drop-shadow');
    expect(img.className).not.toContain('object-cover');
    expect(img).toHaveAttribute('data-cutout', 'true');
  });
});
