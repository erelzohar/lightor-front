import { describe, expect, it } from 'vitest';
import { sitePageOf } from '../../services/sitePages';

describe('sitePageOf (LT-539)', () => {
  it('reads the root as the home page, with or without a trailing slash', () => {
    expect(sitePageOf('/')).toEqual({ kind: 'home' });
    expect(sitePageOf('//')).toEqual({ kind: 'home' });
  });

  it('calls anything else missing', () => {
    expect(sitePageOf('/about')).toEqual({ kind: 'missing' });
    expect(sitePageOf('/wp-login.php')).toEqual({ kind: 'missing' });
  });
});

describe('sitePageOf: products (LT-540)', () => {
  it('knows the list and a product, with or without a trailing slash', () => {
    expect(sitePageOf('/products')).toEqual({ kind: 'products' });
    expect(sitePageOf('/products/')).toEqual({ kind: 'products' });
    expect(sitePageOf('/products/silver-ring')).toEqual({ kind: 'product', slug: 'silver-ring' });
  });

  it('calls anything deeper missing', () => {
    expect(sitePageOf('/products/a/b')).toEqual({ kind: 'missing' });
  });
});
