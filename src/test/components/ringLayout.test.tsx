import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import MeshHero from '../../components/Layout/heroes/MeshHero';
import { ringLayout } from '../../components/Layout/heroes/ringLayout';
import { HeroConfig } from '../../models/HeroConfig';

const texts = (value: string) => ringLayout(value).pieces.map((piece) => piece.text);

/**
 * LT-696 - the name round the seal read backwards in Hebrew on every iPhone
 * browser: text on an SVG path is placed there in typing order. The ring now
 * stands every letter at its own angle, in the order it is seen.
 */
describe('the words round the ring (LT-696)', () => {
  it('stands Hebrew letters in the order they are seen: the first letter last going clockwise', () => {
    expect(texts('אבג')).toEqual(['ג', 'ב', 'א']);
    expect(ringLayout('אבג').pieces.every((piece) => piece.rtl)).toBe(true);
    // A word with its space and the dot between repeats.
    expect(texts('אב גד • ')).toEqual(['•', 'ד', 'ג', 'ב', 'א']);
  });

  it('keeps English as it is typed', () => {
    expect(texts('Go on')).toEqual(['G', 'o', 'o', 'n']);
    expect(ringLayout('Go').pieces.some((piece) => piece.rtl)).toBe(false);
  });

  it('keeps a Latin word and a number in their own order inside Hebrew', () => {
    expect(texts('אב Go 12')).toEqual(['G', 'o', '1', '2', 'ב', 'א']);
  });

  it('keeps a joined word whole: Arabic letters are never pulled apart', () => {
    expect(texts('صالون الجمال')).toEqual(['الجمال', 'صالون']);
  });

  it('keeps a letter with its marks as one piece', () => {
    expect(texts('שָׁלוֹם')).toEqual(['ם', 'וֹ', 'ל', 'שָׁ']);
  });

  it('turns a bracket with its Hebrew words', () => {
    const pieces = ringLayout('(אב)').pieces;
    expect(pieces.map((piece) => piece.text)).toEqual([')', 'ב', 'א', '(']);
    expect(pieces.every((piece) => piece.rtl)).toBe(true);
  });

  it('goes exactly once round: rising angles inside one full turn', () => {
    for (const value of ['חנות אונליין • חנות אונליין • ', 'GTA 6 Store • ', 'صالون الجمال • ', 'גל • גל • גל • גל • ']) {
      const angles = ringLayout(value).pieces.map((piece) => piece.angle);
      expect(angles.length).toBeGreaterThan(1);
      angles.forEach((angle, i) => {
        expect(angle).toBeGreaterThanOrEqual(0);
        expect(angle).toBeLessThan(360);
        if (i) expect(angle).toBeGreaterThan(angles[i - 1]);
      });
    }
  });

  it('writes a long name smaller, never off the ring', () => {
    expect(ringLayout('חנות אונליין • ').fontSize).toBe(9);
    const long = ringLayout('המספרה של דני ושות׳ - עיצוב שיער לגברים ולנשים ברמת גן ובגבעתיים • ');
    expect(long.fontSize).toBeLessThan(9);
    expect(long.fontSize).toBeGreaterThanOrEqual(4.5);
    expect(ringLayout('x'.repeat(400)).fontSize).toBe(4.5);
    expect(ringLayout('').pieces).toEqual([]);
  });

  it('draws the seal with a letter per place and no text on a path', () => {
    const hero = HeroConfig.fromJSON({ visible: true, title: 'כותרת', subtitle: 'תיאור' });
    render(<MeshHero config={hero} businessName="חנות אונליין" dark={false} still actions={null} noTrack={false} />);
    const seal = screen.getByTestId('mesh-seal');
    expect(seal.querySelector('textPath')).toBeNull();
    const letters = Array.from(seal.querySelectorAll('svg text'));
    expect(letters.length).toBe(36);
    expect(letters.every((letter) => (letter.textContent ?? '').length === 1)).toBe(true);
    expect(letters.every((letter) => /^rotate\([\d.]+ 50 50\)$/.test(letter.getAttribute('transform') ?? ''))).toBe(true);
    // Read against the clock, as Hebrew is on a ring: the name as typed.
    expect(letters.map((letter) => letter.textContent).reverse().join('')).toContain('חנותאונליין');
  });
});
