import { describe, it, expect } from 'vitest';
import { parseBlocks, BLOCK_TYPES } from '../../models/Block';
import { WebsiteConfig } from '../../models/WebsiteConfig';
import { SUPPORTED_BLOCKS } from '../../components/blocks/ComposedPage';
import { RAW_AI_RESPONSE_SHAPE } from '../fixtures/rawAiConfig';

describe('blocks (LT-133)', () => {
  it('parses a blocks array leniently: unknown types and junk dropped, ids filled', () => {
    const out = parseBlocks([
      { id: 'h', type: 'hero', variant: 'poster-split' },
      { type: 'gallery', mod: { tone: 'surface', invert: true } },
      { type: 'spaceship' },
      'nope',
      null,
      { type: 'footer', variant: 'ticker' },
    ]);
    expect(out.map((b) => b.type)).toEqual(['hero', 'gallery', 'footer']);
    expect(out[1].id).toBe('b2');
    expect(out[1].mod?.invert).toBe(true);
    expect(parseBlocks(undefined)).toEqual([]);
    expect(parseBlocks('x')).toEqual([]);
  });

  it('carries blocks through WebsiteConfig.fromJSON and defaults to none (legacy flow)', () => {
    const base = RAW_AI_RESPONSE_SHAPE;
    expect(WebsiteConfig.fromJSON(base).blocks).toEqual([]);
    const composed = WebsiteConfig.fromJSON({ ...base, blocks: [{ type: 'hero' }, { type: 'schedule' }] });
    expect(composed.blocks.map((b) => b.type)).toEqual(['hero', 'schedule']);
  });

  it('every supported renderer type is a catalog type', () => {
    for (const t of SUPPORTED_BLOCKS) expect(BLOCK_TYPES).toContain(t);
    expect(SUPPORTED_BLOCKS.size).toBe(26);
    for (const t of BLOCK_TYPES) expect(SUPPORTED_BLOCKS.has(t)).toBe(true);
  });
});
