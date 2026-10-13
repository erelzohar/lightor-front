import { afterEach, describe, expect, it, vi } from 'vitest';
import { boxOf, pickAtPoint } from '../../services/editMode';

/**
 * LT-289 — the site editor's outline and pick, on the navbar: the closed
 * menu's links (clipped below a zero-height panel) must not stretch the
 * navbar's outline, and a click on the open menu's switch must not reach
 * through to the hero headline drawn beneath it.
 */
const rect = (left: number, top: number, width: number, height: number) => new DOMRect(left, top, width, height);
const at = (el: Element, r: DOMRect) => vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(r);

const page = () => {
  document.body.innerHTML = `
    <div data-lt-section="navbar" data-lt-section-type="navbar" style="display: contents">
      <nav id="nav"><button id="theme"><svg id="moon"></svg></button><div id="menu"><a id="link" href="#about">About</a></div></nav>
    </div>
    <div data-lt-section="hero" data-lt-section-type="hero" style="display: contents">
      <section id="hero"><h1 id="title" data-lt-edit="components.hero.title">Hello</h1><div id="veil"></div></section>
    </div>`;
  const $ = (id: string) => document.getElementById(id) as HTMLElement;
  return { $ };
};

afterEach(() => {
  vi.restoreAllMocks();
  delete (document as { elementsFromPoint?: unknown }).elementsFromPoint;
});

describe("the editor's outline of a section (LT-289)", () => {
  it('is the box of what the section holds, not the text a closed menu spills below it', () => {
    const { $ } = page();
    at($('nav'), rect(0, 0, 400, 72));
    at($('link'), rect(0, 300, 120, 24)); // clipped by the closed menu, laid out below
    // What a range over the section measures in a browser (jsdom has none): the spill included.
    const proto = Range.prototype as { getBoundingClientRect?: () => DOMRect };
    proto.getBoundingClientRect = () => rect(0, 0, 400, 324);
    try {
      expect(boxOf(document.querySelector('[data-lt-section="navbar"]')!)).toMatchObject({ top: 0, height: 72, width: 400 });
    } finally {
      delete proto.getBoundingClientRect;
    }
  });
});

describe('what a click picks (LT-289)', () => {
  it("picks the navbar for its switch, though the hero's headline lies beneath", () => {
    const { $ } = page();
    (document as { elementsFromPoint?: unknown }).elementsFromPoint = () => [$('moon'), $('theme'), $('nav'), $('title'), $('hero'), document.body];
    expect(pickAtPoint(10, 10, $('moon'))).toMatchObject({ kind: 'section', section: 'navbar', path: null });
  });

  it('still looks through a veil to the field beneath, inside one section', () => {
    const { $ } = page();
    (document as { elementsFromPoint?: unknown }).elementsFromPoint = () => [$('veil'), $('title'), $('hero'), document.body];
    expect(pickAtPoint(10, 10, $('veil'))).toMatchObject({ path: 'components.hero.title', section: 'hero' });
  });
});
