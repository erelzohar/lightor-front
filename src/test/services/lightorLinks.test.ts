import { describe, it, expect } from 'vitest';
import { dashboardLink, wizardLink } from '../../services/lightorLinks';

/** LT-710: a link to Lightor's own apps carries the language the visitor reads the site in. */
describe('links to the wizard and the dashboard', () => {
  it('add ?lang= for each of the five languages', () => {
    for (const lang of ['he', 'en', 'ar', 'fr', 'es']) {
      expect(wizardLink(lang)).toBe(`https://register.lightor.app/?lang=${lang}`);
      expect(dashboardLink(lang)).toBe(`https://dashboard.lightor.app/?lang=${lang}`);
    }
  });

  it('keep the other parameters and add lang beside them', () => {
    expect(wizardLink('fr', { ref: 'badge' })).toBe('https://register.lightor.app/?ref=badge&lang=fr');
  });

  it('leave lang out for anything that is not one of the five', () => {
    expect(wizardLink('ru')).toBe('https://register.lightor.app/');
    expect(wizardLink('', { ref: 'badge' })).toBe('https://register.lightor.app/?ref=badge');
  });
});
