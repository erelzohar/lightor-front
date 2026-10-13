import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { boxOf, elementForSection, elementsForPath, pickAtPoint, selectMessage, type EditTarget, type SiteToEditor } from '../services/editMode';

const boxesFor = (target: EditTarget | null): DOMRect[] => {
  if (!target) return [];
  if (target.path) return elementsForPath(document, target.path).map(boxOf).filter((r): r is DOMRect => !!r);
  if (target.section) {
    const el = elementForSection(document, target.section);
    const box = el ? boxOf(el) : null;
    return box ? [box] : [];
  }
  return [];
};

// LT-287: what a second click may use rather than select.
const INTERACTIVE = 'button, [role="button"], [role="switch"], [role="tab"], [role="menuitem"], summary, label, input, select, textarea, a[href]';

/**
 * A click on a control inside what is already selected — the menu button, the
 * dark-mode switch — does what it does on the site: the first click picks
 * the section for the editor, the next one uses it. A link that would leave
 * the page stays held (only in-page "#…" links pass); so do form submits.
 */
export const usesSelected = (target: EventTarget | null, picked: ReturnType<typeof pickAtPoint>, selected: EditTarget | null): boolean => {
  if (!selected || !picked || !(target instanceof Element)) return false;
  const same = selected.path ? picked.path === selected.path : !!selected.section && picked.section === selected.section;
  if (!same) return false;
  const control = target.closest(INTERACTIVE);
  if (!control) return false;
  if (control instanceof HTMLAnchorElement) return (control.getAttribute('href') ?? '').startsWith('#');
  return true;
};

const sameBoxes = (a: DOMRect[], b: DOMRect[]) =>
  a.length === b.length && a.every((r, i) => r.left === b[i].left && r.top === b[i].top && r.width === b[i].width && r.height === b[i].height);

/**
 * LT-243: the site editor's layer over the page. Pointing outlines the field
 * or section underneath; a click selects it and tells the editor — and goes
 * nowhere else: links, buttons, the booking flow and forms are held while the
 * editor is on (capture phase, ahead of React's own listeners on the root).
 * LT-287: except a second click on a control inside the selection (see
 * usesSelected), so the menu and the dark-mode switch can be used.
 */
const EditOverlay = ({ selected, onPick }: { selected: EditTarget | null; onPick: (message: SiteToEditor) => void }) => {
  const [hover, setHover] = useState<EditTarget | null>(null);
  const [boxes, setBoxes] = useState<{ hover: DOMRect[]; selected: DOMRect[] }>({ hover: [], selected: [] });
  const onPickRef = useRef(onPick);
  useEffect(() => { onPickRef.current = onPick; }, [onPick]);
  const selectedRef = useRef(selected);
  useEffect(() => { selectedRef.current = selected; }, [selected]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const picked = pickAtPoint(e.clientX, e.clientY, e.target);
      setHover((prev) => {
        const next = picked ? { path: picked.path, section: picked.section } : null;
        return prev?.path === next?.path && prev?.section === next?.section ? prev : next;
      });
    };
    const onLeave = () => setHover(null);
    const onClick = (e: MouseEvent) => {
      const picked = pickAtPoint(e.clientX, e.clientY, e.target);
      if (usesSelected(e.target, picked, selectedRef.current)) return; // LT-287: let it work
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      onPickRef.current(selectMessage(picked));
    };
    const hold = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };
    document.addEventListener('pointermove', onMove, true);
    document.addEventListener('pointerleave', onLeave, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('auxclick', hold, true);
    document.addEventListener('submit', hold, true);
    return () => {
      document.removeEventListener('pointermove', onMove, true);
      document.removeEventListener('pointerleave', onLeave, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('auxclick', hold, true);
      document.removeEventListener('submit', hold, true);
    };
  }, []);

  // Boxes follow the page every frame: scrolling, a carousel, an image
  // loading or a section animating in all move what is being pointed at.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const next = { hover: boxesFor(hover), selected: boxesFor(selected) };
      setBoxes((prev) => (sameBoxes(prev.hover, next.hover) && sameBoxes(prev.selected, next.selected) ? prev : next));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [hover, selected]);

  // Kept inside the viewport, so a full-bleed section (the hero fills the
  // screen) still shows its outline along the edges.
  const frame = (r: DOMRect) => {
    const left = Math.max(r.left - 3, 1);
    const top = Math.max(r.top - 3, 1);
    const right = Math.min(r.right + 3, window.innerWidth - 1);
    const bottom = Math.min(r.bottom + 3, window.innerHeight - 1);
    return { position: 'fixed' as const, left, top, width: Math.max(right - left, 0), height: Math.max(bottom - top, 0), borderRadius: 6 };
  };

  return createPortal(
    <div aria-hidden="true" data-lt-overlay="" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 2147483646 }}>
      {boxes.hover.map((r, i) => (
        <div key={`h${i}`} style={{ ...frame(r), outline: '2px dashed rgba(37, 99, 235, 0.85)' }} />
      ))}
      {boxes.selected.map((r, i) => (
        <div key={`s${i}`} style={{ ...frame(r), outline: '2px solid #2563eb', background: 'rgba(37, 99, 235, 0.07)' }} />
      ))}
    </div>,
    document.body
  );
};

export default EditOverlay;
