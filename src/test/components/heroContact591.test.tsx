import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ComposedPage from '../../components/blocks/ComposedPage';
import { WebsiteConfig } from '../../models/WebsiteConfig';
import { getSiteJitter } from '../../services/seed';
import { withoutPaidDesigns } from '../../services/paidDesigns';
import { BUBBLES } from '../../components/Layout/Contact';
import { RAW_AI_RESPONSE_SHAPE } from '../fixtures/rawAiConfig';

class NoopObserver { observe() {} unobserve() {} disconnect() {} takeRecords(): IntersectionObserverEntry[] { return []; } }
vi.stubGlobal('IntersectionObserver', NoopObserver);
vi.mock('@marsidev/react-turnstile', () => ({ Turnstile: (): null => null }));
vi.mock('../../services/AuthService', () => ({ default: { handshake: vi.fn().mockResolvedValue(true) } }));
vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'he' }),
}));

const page = (blocks: unknown[], extra: Record<string, unknown> = {}) => {
  const config = WebsiteConfig.fromJSON({
    ...RAW_AI_RESPONSE_SHAPE,
    contact: { phone: '0501234567', mail: 'hello@example.com' },
    address: { street: 'הרצל 1', city: 'תל אביב' },
    components: { ...RAW_AI_RESPONSE_SHAPE.components, hero: { ...RAW_AI_RESPONSE_SHAPE.components.hero, heroImageSrc: 'hero.webp', title: 'כל פסגה', subtitle: 'מלמדת משהו' } },
    blocks,
    ...extra,
  });
  return render(<ComposedPage config={config} jitter={getSiteJitter('lt591')} isPreview={false} />);
};

describe('the slant hero (LT-591)', () => {
  it('draws the words, the second line in the site\'s colour, the business\'s contact line and the photo', () => {
    page([{ id: 'h', type: 'hero', variant: 'slant' }]);
    const hero = screen.getByTestId('hero-slant');
    expect(hero.querySelector('h1')?.textContent).toContain('כל פסגה');
    expect(hero.querySelector('h1 span.block')?.className).toContain('text-primary-readable');
    const links = Array.from(hero.querySelectorAll('ul a')).map((a) => a.getAttribute('href'));
    expect(links[0]).toMatch(/^tel:/);
    expect(links[1]).toBe('mailto:hello@example.com');
    expect(links[2]).toContain('maps.google.com');
    expect(hero.querySelector('img[src*="hero.webp"]')).not.toBeNull();
  });

  it('puts the photo first on a phone and beside the words wider, its slant a style of its own', () => {
    page([{ id: 'h', type: 'hero', variant: 'slant' }]);
    const photo = screen.getByTestId('hero-slant').querySelector('.lt-slant') as HTMLElement;
    expect(photo.className).toContain('order-first');
    expect(photo.className).toContain('md:order-none');
  });
});

describe('the bubbles contact section (LT-591)', () => {
  it('draws the form in a card over the picture, with bubbles', () => {
    page([{ id: 'c', type: 'contact', variant: 'bubbles' }], { conversion: 'lead' });
    const section = screen.getByTestId('contact-bubbles');
    expect(section.querySelector('h2#contact-title')).not.toBeNull();
    expect(section.querySelector('form')).not.toBeNull();
    expect(screen.getByTestId('contact-bubbles-layer').querySelectorAll('.lt-bubble')).toHaveLength(BUBBLES.length);
  });

  it('places every bubble the same each time, inside the section', () => {
    expect(BUBBLES.every((b) => b.left >= 0 && b.left < 100 && b.size >= 10 && b.size < 30)).toBe(true);
  });

  it('is a paid design: the free plan shows the plain contact', () => {
    const served = withoutPaidDesigns({ design: { contactLayout: 'bubbles' }, blocks: [{ type: 'contact', variant: 'bubbles' }] });
    expect(served.design).toEqual({ contactLayout: 'split' });
    expect(served.blocks).toEqual([{ type: 'contact', variant: 'split' }]);
  });
});
