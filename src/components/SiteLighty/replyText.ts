import { displayPhone, telHref } from '../../utils/phone';

/**
 * LT-302: Lighty's reply as the widget draws it — plain text with **bold**
 * and links to a section of this page only (the server already drops every
 * other link; this is the client's half of the same rule). Never HTML.
 * LT-597: and to the site's products: the page of all of them (`/products`)
 * and one product's page (`/products/<slug>`), opened in the site itself.
 *
 * LT-432: the model sometimes wraps a link in bold ("**[Leave your
 * details](#contact)**"); it stays a link, which is drawn bold anyway. A
 * phone number is one piece: a call link that reads left to right and never
 * breaks across lines.
 */
export type ReplyPart =
  | { kind: 'text'; text: string }
  | { kind: 'bold'; text: string }
  | { kind: 'link'; text: string; section: string }
  | { kind: 'page'; text: string; path: string }
  | { kind: 'phone'; text: string; href: string };

const SECTIONS = new Set(['schedule', 'contact', 'services', 'about', 'portfolio', 'faq', 'products']);

// A section of this page, or (LT-597) the products' page or one product's (a slug is latin, digits and hyphens).
const HREF = String.raw`#[a-z]+|\/products(?:\/[a-z0-9-]{1,60})?`;
const MARKUP = new RegExp(String.raw`\*\*([^*\n]{1,200})\*\*|\[([^\]\n]{1,80})\]\((${HREF})\)`, 'g');
const LINK = new RegExp(String.raw`\[([^\]\n]{1,80})\]\((${HREF})\)`, 'g');

// An Israeli number as people write it: 050-8801872, 0508801872, 03-1234567,
// 077 123 4567, +972 50-880-1872. Seven digits after the area code, a space
// or a hyphen allowed between any two; no digit right after.
const PHONE = /(?:\+972[\s-]?|0)(?:5\d|7\d|[23489])(?:[\s-]?\d){7}(?!\d)/g;

/** A section link's words, with any bold the model put inside them dropped. */
const linkText = (text: string): string => text.replace(/\*\*/g, '');

/** A link the widget follows (a known section, a products page), else its words as `kind`. */
const linkPart = (label: string, href: string, kind: 'text' | 'bold'): ReplyPart => {
  if (href.startsWith('/')) return { kind: 'page', text: linkText(label), path: href };
  const section = href.slice(1);
  return SECTIONS.has(section) ? { kind: 'link', text: linkText(label), section } : { kind, text: linkText(label) };
};

/** Phone numbers in a run of text or bold become call links; the rest stays as it was. */
const withPhones = (text: string, kind: 'text' | 'bold'): ReplyPart[] => {
  const parts: ReplyPart[] = [];
  let last = 0;
  for (const m of text.matchAll(PHONE)) {
    const at = m.index ?? 0;
    // The tail of a longer number ("12050-8801872") is not a phone.
    if (/[\d+]/.test(text[at - 1] ?? '')) continue;
    if (at > last) parts.push({ kind, text: text.slice(last, at) });
    parts.push({ kind: 'phone', text: displayPhone(m[0]), href: telHref(m[0]) });
    last = at + m[0].length;
  }
  if (last < text.length) parts.push({ kind, text: text.slice(last) });
  return parts;
};

/** A bold run: a section link inside it stays a link. */
const boldParts = (inner: string): ReplyPart[] => {
  const parts: ReplyPart[] = [];
  let last = 0;
  for (const m of inner.matchAll(LINK)) {
    const at = m.index ?? 0;
    if (at > last) parts.push(...withPhones(inner.slice(last, at), 'bold'));
    parts.push(linkPart(m[1], m[2], 'bold'));
    last = at + m[0].length;
  }
  if (last < inner.length) parts.push(...withPhones(inner.slice(last), 'bold'));
  return parts;
};

export const replyParts = (reply: string): ReplyPart[] => {
  const parts: ReplyPart[] = [];
  let last = 0;
  for (const m of reply.matchAll(MARKUP)) {
    const at = m.index ?? 0;
    if (at > last) parts.push(...withPhones(reply.slice(last, at), 'text'));
    if (m[1] !== undefined) parts.push(...boldParts(m[1]));
    else parts.push(linkPart(m[2], m[3], 'text'));
    last = at + m[0].length;
  }
  if (last < reply.length) parts.push(...withPhones(reply.slice(last), 'text'));
  return parts;
};
