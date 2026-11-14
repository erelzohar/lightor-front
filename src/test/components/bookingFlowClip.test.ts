import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * LT-660 - the booking flow's wrapper clips (overflow-hidden, for its exit
 * into the green dot). Its content used to sit flush on that clip, so the
 * full-width "send code" button, which grows 2% on hover, lost its rounded
 * ends, and so did the service cards and the fields' focus rings. The clip
 * now stands 12px out, inside the card's own padding.
 */
describe('the booking flow`s clip leaves room for what grows on hover', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../../components/Layout/Schedule/Schedule.tsx'), 'utf8');
  const flow = source.slice(source.indexOf('key="booking-flow"'));
  const className = /className="([^"]*overflow-hidden[^"]*)"/.exec(flow)?.[1] ?? '';

  it('the clipping wrapper is pushed out and padded back by the same step', () => {
    expect(className.split(' ')).toEqual(expect.arrayContaining(['overflow-hidden', '-m-3', 'p-3']));
  });

  it('the padded cards are wider than the room the clip takes (p-6 = 24px against 12px)', () => {
    for (const style of ['card', 'inset', 'split']) {
      expect(source).toMatch(new RegExp(`${style}: '[^']*\\bp-6\\b`));
    }
  });
});
