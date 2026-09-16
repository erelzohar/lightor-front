/**
 * LT-137: navbar links for a composed page come from the blocks that exist,
 * in page order — never from section flags a composed page may not honour.
 * Returns [href, labelKey, fallback] tuples; the navbar translates.
 */
export interface NavLink {
  href: string;
  key: string;
  fallbackHe: string;
  fallbackEn: string;
  /** LT-168: the section's own heading, when it has one — the label the visitor
   *  will actually find on the page. Absent → the generic i18n label. */
  title?: string;
}

interface BlockLike { type: string; id: string }

/** The section headings a menu can borrow (LT-168). */
export interface SectionTitles { about?: string; portfolio?: string; schedule?: string; faq?: string; contact?: string }

/** LT-173: a heading longer than this stays a heading; the menu keeps its generic word.
 *  Sixteen characters is the room a bar with five links, a logo, a name and a
 *  button has per label at tablet width; longer labels wrapped and, worse, let
 *  the business name paint over the first link. */
export const NAV_LABEL_MAX = 16;

const clean = (t: unknown, max = NAV_LABEL_MAX): string | undefined => {
  const s = typeof t === 'string' ? t.trim() : '';
  return s && s.length <= max ? s : undefined;
};

/** Pull the menu-worthy headings out of a config's `components`. */
export const sectionTitlesOf = (c?: {
  about?: { title?: string } | null; portfolio?: { title?: string } | null; schedule?: { title?: string } | null;
  faq?: { title?: string } | null; contact?: { title?: string } | null;
} | null): SectionTitles => ({
  about: clean(c?.about?.title), portfolio: clean(c?.portfolio?.title), schedule: clean(c?.schedule?.title),
  faq: clean(c?.faq?.title), contact: clean(c?.contact?.title),
});

export const navLinksFromBlocks = (blocks: BlockLike[], titles: SectionTitles = {}): NavLink[] => {
  const out: NavLink[] = [];
  const seen = new Set<string>();
  const add = (l: NavLink, title?: string) => {
    if (seen.has(l.href)) return;
    seen.add(l.href);
    const t = clean(title);
    out.push(t ? { ...l, title: t } : l);
  };
  for (const b of blocks) {
    switch (b.type) {
      case 'intro': add({ href: '#about', key: 'nav.about', fallbackHe: 'אודות', fallbackEn: 'About' }, titles.about); break;
      case 'features': if (!seen.has('#about')) add({ href: '#about-features', key: 'nav.about', fallbackHe: 'אודות', fallbackEn: 'About' }, titles.about); break;
      case 'gallery': add({ href: '#portfolio', key: 'nav.portfolio', fallbackHe: 'תיק עבודות', fallbackEn: 'Work' }, titles.portfolio); break;
      case 'ledger':
      case 'priceCards': add({ href: '#services', key: 'services.ledger_title', fallbackHe: 'מחירון', fallbackEn: 'Services' }); break;
      case 'schedule': add({ href: '#schedule', key: 'nav.schedule', fallbackHe: 'קביעת תור', fallbackEn: 'Book' }, titles.schedule); break;
      case 'faq': add({ href: '#faq', key: 'nav.faq', fallbackHe: 'שאלות', fallbackEn: 'FAQ' }, titles.faq); break;
      case 'contact': add({ href: '#contact', key: 'nav.contact', fallbackHe: 'צור קשר', fallbackEn: 'Contact' }, titles.contact); break;
      case 'visit': if (!seen.has('#contact')) add({ href: '#about-visit', key: 'nav.contact', fallbackHe: 'צור קשר', fallbackEn: 'Contact' }); break;
      default: break;
    }
  }
  // One About link: the intro anchor wins over the features anchor.
  if (seen.has('#about') && seen.has('#about-features')) { const i = out.findIndex((l) => l.href === '#about-features'); if (i !== -1) out.splice(i, 1); }
  // Five links at most: schedule and contact always keep their place.
  if (out.length > 5) {
    const keep = new Set(['#schedule', '#contact', '#about-visit']);
    let extra = out.length - 5;
    for (let i = out.length - 1; i >= 0 && extra > 0; i--) {
      if (!keep.has(out[i].href)) { out.splice(i, 1); extra--; }
    }
  }
  return out;
};
