/**
 * LT-302: Lighty's reply as the widget draws it — plain text with **bold**
 * and links to a section of this page only (the server already drops every
 * other link; this is the client's half of the same rule). Never HTML.
 */
export type ReplyPart =
  | { kind: 'text'; text: string }
  | { kind: 'bold'; text: string }
  | { kind: 'link'; text: string; section: string };

const SECTIONS = new Set(['schedule', 'contact', 'services', 'about', 'portfolio', 'faq']);

export const replyParts = (reply: string): ReplyPart[] => {
  const parts: ReplyPart[] = [];
  const re = /\*\*([^*\n]{1,200})\*\*|\[([^\]\n]{1,80})\]\(#([a-z]+)\)/g;
  let last = 0;
  for (const m of reply.matchAll(re)) {
    const at = m.index ?? 0;
    if (at > last) parts.push({ kind: 'text', text: reply.slice(last, at) });
    if (m[1] !== undefined) parts.push({ kind: 'bold', text: m[1] });
    else if (SECTIONS.has(m[3])) parts.push({ kind: 'link', text: m[2], section: m[3] });
    else parts.push({ kind: 'text', text: m[2] });
    last = at + m[0].length;
  }
  if (last < reply.length) parts.push({ kind: 'text', text: reply.slice(last) });
  return parts;
};
