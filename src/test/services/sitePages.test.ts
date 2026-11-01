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
