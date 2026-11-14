import { describe, it, expect, afterEach } from 'vitest';
import { INLINE_CONFIG_ID, readInlineConfig, sameConfig, languageAfterRefresh } from '../../services/edgeShell';

const inline = (body: string, type = 'application/json') => {
  const script = document.createElement('script');
  script.id = INLINE_CONFIG_ID;
  script.setAttribute('type', type);
  script.textContent = body;
  document.head.appendChild(script);
  return script;
};

/** The edge shell's inlined config (LT-194): used only when it is this host's. */
describe('readInlineConfig', () => {
  afterEach(() => {
    document.getElementById(INLINE_CONFIG_ID)?.remove();
  });

  it('is null without the script, with an empty one, or with malformed JSON', () => {
    expect(readInlineConfig(document, 'erelos.lightor.app')).toBeNull();
    inline('   ');
    expect(readInlineConfig(document, 'erelos.lightor.app')).toBeNull();
    document.getElementById(INLINE_CONFIG_ID)?.remove();
    inline('{not json');
    expect(readInlineConfig(document, 'erelos.lightor.app')).toBeNull();
  });

  it('reads the config for its own host and refuses another host', () => {
    inline(JSON.stringify({ subDomain: 'erelos', fetchedAt: '2026-09-24T10:00:00.000Z', config: { businessName: 'Erelos' } }));
    expect(readInlineConfig(document, 'erelos.lightor.app')).toEqual({
      subDomain: 'erelos',
      fetchedAt: '2026-09-24T10:00:00.000Z',
      config: { businessName: 'Erelos' },
    });
    expect(readInlineConfig(document, 'zoharsweets.lightor.app')).toBeNull();
    expect(readInlineConfig(document, 'erelos.localhost')).not.toBeNull();
  });

  it('refuses a script of another type, a missing subDomain, or a config that is not an object', () => {
    inline(JSON.stringify({ subDomain: 'erelos', config: { a: 1 } }), 'text/plain');
    expect(readInlineConfig(document, 'erelos.lightor.app')).toBeNull();
    document.getElementById(INLINE_CONFIG_ID)?.remove();
    inline(JSON.stringify({ config: { a: 1 } }));
    expect(readInlineConfig(document, 'erelos.lightor.app')).toBeNull();
    document.getElementById(INLINE_CONFIG_ID)?.remove();
    inline(JSON.stringify({ subDomain: 'erelos', config: [1] }));
    expect(readInlineConfig(document, 'erelos.lightor.app')).toBeNull();
  });

  // LT-661: on a business's own domain the first label says nothing; the edge
  // writes the host it served the page on, and that must be this host.
  it("reads the config on a business's own domain when it was served for that host", () => {
    inline(JSON.stringify({ subDomain: 'dana', host: 'www.dana-studio.co.il', fetchedAt: '2026-11-15T10:00:00.000Z', config: { businessName: 'Dana' } }));
    expect(readInlineConfig(document, 'www.dana-studio.co.il')).toEqual({
      subDomain: 'dana',
      host: 'www.dana-studio.co.il',
      fetchedAt: '2026-11-15T10:00:00.000Z',
      config: { businessName: 'Dana' },
    });
    expect(readInlineConfig(document, 'WWW.Dana-Studio.co.il')).not.toBeNull();
    // Another outside host, the bare domain included: not this page's config.
    expect(readInlineConfig(document, 'dana-studio.co.il')).toBeNull();
    expect(readInlineConfig(document, 'www.another-business.com')).toBeNull();
    // On a Lightor host the rule is the first label, as before, whatever `host` says.
    expect(readInlineConfig(document, 'dana.lightor.app')).not.toBeNull();
    expect(readInlineConfig(document, 'zoharsweets.lightor.app')).toBeNull();
  });

  it("refuses a config without a host on a business's own domain, even when the first label matches", () => {
    inline(JSON.stringify({ subDomain: 'www', config: { businessName: 'Someone' } }));
    expect(readInlineConfig(document, 'www.dana-studio.co.il')).toBeNull();
    document.getElementById(INLINE_CONFIG_ID)?.remove();
    inline(JSON.stringify({ subDomain: 'dana', host: 42, config: { businessName: 'Dana' } }));
    expect(readInlineConfig(document, 'www.dana-studio.co.il')).toBeNull();
    document.getElementById(INLINE_CONFIG_ID)?.remove();
    // A look-alike of the zone is an outside host.
    inline(JSON.stringify({ subDomain: 'dana', host: 'dana.lightor.app', config: { businessName: 'Dana' } }));
    expect(readInlineConfig(document, 'dana.lightor.app.attacker.com')).toBeNull();
  });
});

describe('sameConfig', () => {
  it('compares by JSON and never throws', () => {
    expect(sameConfig({ a: 1, b: [1, 2] }, { a: 1, b: [1, 2] })).toBe(true);
    expect(sameConfig({ a: 1 }, { a: 2 })).toBe(false);
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(sameConfig(cyclic, cyclic)).toBe(false);
  });
});

/**
 * LT-209 — the page paints from the edge's copy, then swaps in the API's.
 * The language used to come from the edge's copy alone, so an owner's new
 * default waited out the edge cache.
 */
describe('languageAfterRefresh', () => {
  it("switches to the owner's new default while the page still shows the old one", () => {
    expect(languageAfterRefresh('he', 'en', 'he')).toBe('en');
  });

  it('leaves a language the visitor picked in the meantime', () => {
    expect(languageAfterRefresh('he', 'en', 'fr')).toBeNull();
    expect(languageAfterRefresh('he', 'en', 'en')).toBeNull();
  });

  it('does nothing when the default did not change, or the API names none', () => {
    expect(languageAfterRefresh('he', 'he', 'he')).toBeNull();
    expect(languageAfterRefresh('he', undefined, 'he')).toBeNull();
    expect(languageAfterRefresh('he', '', 'he')).toBeNull();
  });
});
