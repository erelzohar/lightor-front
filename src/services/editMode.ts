import { createContext, useContext } from 'react';

/**
 * LT-243 — the site editor's view of the page (`lightor-ai-split-plan.md` §4).
 *
 * While the dashboard's editor is on (it posts `LT_EDIT {on: true}`), every
 * owner-authored text and image carries the config path it is drawn from
 * (`data-lt-edit`) and every section its block id or legacy key
 * (`data-lt-section`). The overlay turns a click into that path; the editor
 * looks the path up in its registry. Nothing is annotated otherwise — public
 * pages and the register's preview never carry these attributes.
 *
 * Paths are dotted config paths with numeric indices:
 *   components.hero.title · components.about.features.1.title ·
 *   components.portfolio.items.2.url · blocks.<blockId>.props.text ·
 *   services.<appointmentTypeId>.name (saved through the services API) ·
 *   businessName · logoImageName
 */
export type EditKind = 'text' | 'image';

export interface EditState {
  /** The editor is on: elements annotated, overlay drawn, clicks held, motion paused. */
  editing: boolean;
}

export const EditContext = createContext<EditState>({ editing: false });

export const useEdit = (): EditState => useContext(EditContext);

/** The attributes marking one editable element; nothing outside the editor. */
export const editAttrs = (editing: boolean, path: string | undefined | null, kind: EditKind = 'text'): Record<string, string> =>
  editing && path ? { 'data-lt-edit': path, 'data-lt-kind': kind } : {};

/** `const ed = useEditAttrs(); <h1 {...ed('components.hero.title')}>` */
export const useEditAttrs = () => {
  const { editing } = useEdit();
  return (path: string | undefined | null, kind: EditKind = 'text') => editAttrs(editing, path, kind);
};

/** The path of a service field (services live in their own collection). */
export const servicePath = (id: string | undefined, field: 'name' | 'price' | 'image'): string | undefined =>
  id ? `services.${id}.${field}` : undefined;

// ── The bridge with the editor (postMessage) ────────────────────────────

/** Editor → site. */
export type EditorToSite =
  | { type: 'LT_EDIT'; on: boolean }
  | { type: 'LT_SELECT_PATH'; path?: string | null; section?: string | null }
  | { type: 'LT_SCROLL_TO'; path?: string | null; section?: string | null; /** 'start' when the editor's panel covers the lower screen (a phone). */ block?: 'start' | 'center' };

/** Site → editor. */
/**
 * LT-252: a legacy page (one without blocks) as the blocks it would be —
 * what the editor turns it into when the owner adds or moves a section.
 * `key` is the legacy section a block comes from (its EditSection id).
 */
export interface LayoutBlock {
  key: string;
  type: string;
  variant?: string;
  source?: string;
  mod?: {
    invert?: boolean;
    backdrop?: 'tinted' | 'photo' | 'pattern';
    spacing?: 'tight' | 'huge';
    scale?: 'giant' | 'micro';
    hidden?: boolean;
  };
}

export type SiteToEditor =
  | { type: 'LT_READY' }
  | { type: 'LT_LAYOUT'; blocks: LayoutBlock[] }
  | { type: 'LT_SELECT'; kind: EditKind; path: string; section: string | null; sectionType: string | null; count: number }
  | {
      type: 'LT_SELECT'; kind: 'section'; path: null; section: string; sectionType: string | null; count: 1;
      /** LT-249: every field the section shows, once each, so the editor can hand all its texts to the AI. */
      fields: { path: string; kind: EditKind }[];
    }
  | { type: 'LT_DESELECT' };

const cssEscape = (value: string): string =>
  typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(value) : value.replace(/["\\]/g, '\\$&');

/** Every element drawn from `path` (a field can show in several places). */
export const elementsForPath = (root: ParentNode, path: string): HTMLElement[] =>
  Array.from(root.querySelectorAll<HTMLElement>(`[data-lt-edit="${cssEscape(path)}"]`));

export const elementForSection = (root: ParentNode, section: string): HTMLElement | null =>
  root.querySelector<HTMLElement>(`[data-lt-section="${cssEscape(section)}"]`);

/**
 * The box an element occupies on screen. A section wrapper is
 * `display: contents` (no box of its own, so it cannot disturb the layout),
 * so its box is the union of the boxes it contains. LT-289: the boxes, not a
 * range over the text — a range also counts what a box clips, so the navbar's
 * closed menu (zero height, its links spilling below) stretched the outline
 * far down the page.
 */
export const boxOf = (el: Element): DOMRect | null => {
  const style = typeof getComputedStyle === 'function' ? getComputedStyle(el) : null;
  let rect: DOMRect | null;
  if (style?.display === 'contents') {
    const parts: DOMRect[] = [];
    for (const node of Array.from(el.childNodes)) {
      if (node instanceof Element) {
        const box = boxOf(node);
        if (box) parts.push(box);
      } else if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
        const range = document.createRange();
        range.selectNodeContents(node);
        if (typeof range.getBoundingClientRect === 'function') parts.push(range.getBoundingClientRect()); // not in jsdom
      }
    }
    if (!parts.length) return null;
    const left = Math.min(...parts.map((r) => r.left));
    const top = Math.min(...parts.map((r) => r.top));
    rect = new DOMRect(left, top, Math.max(...parts.map((r) => r.right)) - left, Math.max(...parts.map((r) => r.bottom)) - top);
  } else {
    rect = el.getBoundingClientRect();
  }
  return rect.width > 0 || rect.height > 0 ? rect : null;
};

// ── What a click picks (used by the overlay) ───────────────────────────

/** What the owner points at: one field (by path) or a whole section. */
export interface EditTarget {
  path?: string | null;
  section?: string | null;
}

interface Picked {
  path: string | null;
  kind: EditKind | 'section';
  section: string | null;
  sectionType: string | null;
}

/** The field or section under a DOM node, by its annotations. */
export const pickTarget = (node: EventTarget | null): Picked | null => {
  const el = node instanceof Element ? node : null;
  if (!el) return null;
  const field = el.closest<HTMLElement>('[data-lt-edit]');
  const section = el.closest<HTMLElement>('[data-lt-section]');
  const sectionId = section?.dataset.ltSection ?? null;
  const sectionType = section?.dataset.ltSectionType ?? null;
  if (field?.dataset.ltEdit) {
    return { path: field.dataset.ltEdit, kind: (field.dataset.ltKind as EditKind) || 'text', section: sectionId, sectionType };
  }
  return sectionId ? { path: null, kind: 'section', section: sectionId, sectionType } : null;
};

/**
 * The field under a point, looking through what is drawn on top of it — a
 * gallery caption's gradient, a hero photo's frame — down to the first
 * annotated element of the same section; that section when nothing there is a field. jsdom has
 * no `elementsFromPoint`, so there it reads the event target alone.
 */
export const pickAtPoint = (x: number, y: number, target: EventTarget | null): Picked | null => {
  const stack = typeof document.elementsFromPoint === 'function' ? document.elementsFromPoint(x, y) : [];
  // LT-289: only through what belongs to the section on top — the open menu's
  // dark-mode switch is the navbar's, not the hero headline's drawn beneath it.
  const top = stack[0]?.closest('[data-lt-section]') ?? null;
  for (const el of stack) {
    if (top && el.closest('[data-lt-section]') !== top) break;
    const field = el.closest<HTMLElement>('[data-lt-edit]');
    if (field) return pickTarget(field);
  }
  return pickTarget(stack[0] ?? target);
};

/** The message a click on `picked` sends to the editor. */
export const selectMessage = (picked: Picked | null): SiteToEditor => {
  if (!picked) return { type: 'LT_DESELECT' };
  if (picked.kind === 'section' || !picked.path) {
    const el = elementForSection(document, picked.section as string);
    const fields: { path: string; kind: EditKind }[] = [];
    const seen = new Set<string>();
    el?.querySelectorAll<HTMLElement>('[data-lt-edit]').forEach((node) => {
      const path = node.dataset.ltEdit;
      if (!path || seen.has(path)) return;
      seen.add(path);
      fields.push({ path, kind: (node.dataset.ltKind as EditKind) || 'text' });
    });
    return { type: 'LT_SELECT', kind: 'section', path: null, section: picked.section as string, sectionType: picked.sectionType, count: 1, fields };
  }
  return {
    type: 'LT_SELECT',
    kind: picked.kind,
    path: picked.path,
    section: picked.section,
    sectionType: picked.sectionType,
    count: elementsForPath(document, picked.path).length,
  };
};
