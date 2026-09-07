/**
 * LT-133 (Composer phase 1): a page is an ordered list of blocks. Blocks are
 * LAYOUT — they reference the content the owner already edits (`source`) or
 * carry their own small copy (`props`). A config without blocks renders the
 * legacy flow byte-identically; the composer (phase 2) is what fills this in.
 */
export const BLOCK_TYPES = [
  'hero', 'ticker', 'announcement',
  'manifesto', 'intro', 'stats', 'pullQuote', 'process',
  'features', 'ledger', 'priceCards', 'hours', 'faq', 'visit',
  'gallery', 'photoPair', 'interlude', 'beforeAfter', 'mapStrip', 'logoMark',
  'quote', 'bookingBand', 'schedule', 'contact', 'social', 'footer',
] as const;
export type BlockType = typeof BLOCK_TYPES[number];

export interface BlockMod {
  tone?: 'bg' | 'surface';
  spacing?: 'tight' | 'normal' | 'huge';
  scale?: 'giant' | 'normal' | 'micro';
  invert?: boolean;
  backdrop?: 'none' | 'tinted' | 'photo' | 'pattern';
}

export interface Block {
  id: string;
  type: BlockType;
  variant?: string;
  source?: string;
  props?: Record<string, unknown>;
  mod?: BlockMod;
}

const TYPE_SET = new Set<string>(BLOCK_TYPES);

/** Lenient parse: unknown types and malformed entries are dropped, never thrown. */
export const parseBlocks = (json: unknown): Block[] => {
  if (!Array.isArray(json)) return [];
  const out: Block[] = [];
  json.forEach((raw, i) => {
    if (!raw || typeof raw !== 'object') return;
    const r = raw as Record<string, unknown>;
    if (typeof r.type !== 'string' || !TYPE_SET.has(r.type)) return;
    out.push({
      id: typeof r.id === 'string' && r.id ? r.id : `b${i + 1}`,
      type: r.type as BlockType,
      variant: typeof r.variant === 'string' ? r.variant : undefined,
      source: typeof r.source === 'string' ? r.source : undefined,
      props: r.props && typeof r.props === 'object' ? (r.props as Record<string, unknown>) : undefined,
      mod: r.mod && typeof r.mod === 'object' ? (r.mod as BlockMod) : undefined,
    });
  });
  return out;
};
