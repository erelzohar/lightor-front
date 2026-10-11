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
  | { type: 'LT_SCROLL_TO'; path?: string | null; section?: string | null };

/** Site → editor. */
export type SiteToEditor =
  | { type: 'LT_READY' }
  | { type: 'LT_SELECT'; kind: EditKind; path: string; section: string | null; sectionType: string | null; count: number }
  | { type: 'LT_SELECT'; kind: 'section'; path: null; section: string; sectionType: string | null; count: 1 }
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
 * so its box is the union of what it contains.
 */
export const boxOf = (el: Element): DOMRect | null => {
  const style = typeof getComputedStyle === 'function' ? getComputedStyle(el) : null;
  let rect: DOMRect;
  if (style?.display === 'contents') {
    const range = document.createRange();
    range.selectNodeContents(el);
    if (typeof range.getBoundingClientRect !== 'function') return null; // jsdom
    rect = range.getBoundingClientRect();
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
 * annotated element; a whole section when nothing there is a field. jsdom has
 * no `elementsFromPoint`, so there it reads the event target alone.
 */
export const pickAtPoint = (x: number, y: number, target: EventTarget | null): Picked | null => {
  const stack = typeof document.elementsFromPoint === 'function' ? document.elementsFromPoint(x, y) : [];
  for (const el of stack) {
    const field = el.closest<HTMLElement>('[data-lt-edit]');
    if (field) return pickTarget(field);
  }
  return pickTarget(stack[0] ?? target);
};

/** The message a click on `picked` sends to the editor. */
export const selectMessage = (picked: Picked | null): SiteToEditor => {
  if (!picked) return { type: 'LT_DESELECT' };
  if (picked.kind === 'section' || !picked.path) {
    return { type: 'LT_SELECT', kind: 'section', path: null, section: picked.section as string, sectionType: picked.sectionType, count: 1 };
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
