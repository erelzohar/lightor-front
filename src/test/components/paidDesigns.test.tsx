import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Products from '../../components/products/Products';
import { WebsiteConfig } from '../../models/WebsiteConfig';
import type { Product } from '../../models/Product';
import type { ProductsLayout } from '../../models/DesignConfig';
import { SiteNavContext } from '../../services/siteNav';
import { ProductInquiryContext } from '../../services/productAction';
import { withoutPaidDesigns } from '../../services/paidDesigns';
import { RAW_AI_RESPONSE_SHAPE } from '../fixtures/rawAiConfig';

vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'he' }),
}));

/** LT-570: on the free plan each paid design gives way to its section's default. */
const served = (motion?: boolean) => ({
  ...RAW_AI_RESPONSE_SHAPE,
  ...(motion === undefined ? {} : { motion }),
  design: { stylePreset: 'festive', headingFont: 'secularone', heroLayout: 'parallax', portfolioLayout: 'curve', productsLayout: 'belt', decor: 'metal' },
  blocks: [
    { id: 'h', type: 'hero', variant: 'expand' },
    { id: 'g1', type: 'gallery', variant: 'clothesline' },
    { id: 'g2', type: 'gallery', variant: 'cascade' },
    { id: 'g3', type: 'gallery', variant: 'polaroid' },
    { id: 'p', type: 'products', variant: 'hanger' },
    { id: 'p2', type: 'products', variant: 'coverflow' },
    { id: 'p3', type: 'products', variant: 'orbit' },
    { id: 'q', type: 'quote', variant: 'marquee' },
  ],
});

describe('a site whose plan has no paid designs', () => {
  it('shows each section\'s default in place of a paid design', () => {
    const cfg = WebsiteConfig.fromJSON(served(false));
    expect(cfg.motion).toBe(false);
    expect(cfg.design).toMatchObject({ heroLayout: 'fullbleed', portfolioLayout: 'masonry', productsLayout: 'well', decor: 'none' });
    expect(cfg.blocks.map((b) => [b.type, b.variant])).toEqual([
      ['hero', 'fullbleed'],
      ['gallery', 'masonry'],
      ['gallery', 'masonry'],
      ['gallery', 'polaroid'],
      ['products', 'well'],
      ['products', 'well'],
      ['products', 'well'],
      ['quote', 'marquee'],
    ]);
  });

  it('keeps everything else of the design as it is', () => {
    const cfg = WebsiteConfig.fromJSON(served(false));
    expect(cfg.design.stylePreset).toBe('festive');
    expect(cfg.design.headingFont).toBe('secularone');
  });

  it('leaves what was served untouched, so nothing of the owner\'s pick is lost', () => {
    const json = served(false);
    WebsiteConfig.fromJSON(json);
    expect(json.design.productsLayout).toBe('belt');
    expect(json.blocks[0].variant).toBe('expand');
    expect(withoutPaidDesigns({ blocks: [{ type: 'gallery' }] }).blocks).toEqual([{ type: 'gallery', variant: undefined }]);
  });

  it('draws the quiet tiles where the conveyor was', () => {
    const cfg = WebsiteConfig.fromJSON(served(false));
    const product = (i: number): Product => ({ id: `id${i}`, slug: `p-${i}`, name: `Product ${i}`, price: 1000, images: [{ url: `a${i}.webp` }], details: [] });
    render(
      <SiteNavContext.Provider value={{ atHome: true, go: vi.fn() }}>
        <ProductInquiryContext.Provider value={{ inquiry: null, setInquiry: vi.fn() }}>
          <Products summary={{ total: 6, pages: true, items: Array.from({ length: 6 }, (_, i) => product(i)) }} layout={cfg.design.productsLayout as ProductsLayout} />
        </ProductInquiryContext.Provider>
      </SiteNavContext.Provider>
    );
    expect(screen.getByTestId('products-well')).toBeTruthy();
    expect(screen.queryByTestId('products-belt')).toBeNull();
  });
});

describe('a site with every design', () => {
  it.each([[true], [undefined]])('keeps the paid designs (motion %s: a paid plan, the free days, the register preview)', (motion) => {
    const cfg = WebsiteConfig.fromJSON(served(motion));
    expect(cfg.motion).toBe(true);
    expect(cfg.design).toMatchObject({ heroLayout: 'parallax', portfolioLayout: 'curve', productsLayout: 'belt', decor: 'metal' });
    expect(cfg.blocks.map((b) => b.variant)).toEqual(['expand', 'clothesline', 'cascade', 'polaroid', 'hanger', 'coverflow', 'orbit', 'marquee']);
  });
});
