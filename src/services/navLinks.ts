/**
 * LT-137: navbar links for a composed page come from the blocks that exist,
 * in page order — never from section flags a composed page may not honour.
 * Returns [href, labelKey, fallback] tuples; the navbar translates.
 */
export interface NavLink { href: string; key: string; fallbackHe: string; fallbackEn: string }

interface BlockLike { type: string; id: string }

export const navLinksFromBlocks = (blocks: BlockLike[]): NavLink[] => {
  const out: NavLink[] = [];
  const seen = new Set<string>();
  const add = (l: NavLink) => { if (!seen.has(l.href)) { seen.add(l.href); out.push(l); } };
  for (const b of blocks) {
    switch (b.type) {
      case 'intro': add({ href: '#about', key: 'nav.about', fallbackHe: 'אודות', fallbackEn: 'About' }); break;
      case 'features': if (!seen.has('#about')) add({ href: '#about-features', key: 'nav.about', fallbackHe: 'אודות', fallbackEn: 'About' }); break;
      case 'gallery': add({ href: '#portfolio', key: 'nav.portfolio', fallbackHe: 'תיק עבודות', fallbackEn: 'Work' }); break;
      case 'ledger':
      case 'priceCards': add({ href: '#services', key: 'services.ledger_title', fallbackHe: 'מחירון', fallbackEn: 'Services' }); break;
      case 'schedule': add({ href: '#schedule', key: 'nav.schedule', fallbackHe: 'קביעת תור', fallbackEn: 'Book' }); break;
      case 'faq': add({ href: '#faq', key: 'nav.faq', fallbackHe: 'שאלות', fallbackEn: 'FAQ' }); break;
      case 'contact': add({ href: '#contact', key: 'nav.contact', fallbackHe: 'צור קשר', fallbackEn: 'Contact' }); break;
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
