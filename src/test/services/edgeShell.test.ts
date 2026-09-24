import { describe, it, expect, afterEach } from 'vitest';
import { INLINE_CONFIG_ID, readInlineConfig, sameConfig } from '../../services/edgeShell';

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
