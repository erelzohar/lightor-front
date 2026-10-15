import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import MapStrip from '../../components/blocks/MapStrip';
import WazeLink from '../../components/WazeLink';
import { googleMapsHref, wazeHref } from '../../utils/navigation';

vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'he' }),
}));

/** LT-320: a tester asked for Waze next to Google Maps. */
describe('navigating to the business', () => {
  const address = 'הרצל 12, תל אביב';

  it('builds a Waze link that starts navigation to the address', () => {
    expect(wazeHref(address)).toBe(`https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`);
    expect(googleMapsHref(address)).toBe(`https://maps.google.com/?q=${encodeURIComponent(address)}`);
  });

  it('offers Waze under an address, in a new tab', () => {
    render(<WazeLink address={address} />);
    const link = screen.getByRole('link', { name: 'about.waze' });
    expect(link.getAttribute('href')).toBe(wazeHref(address));
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
  });

  it('puts Waze beside Google Maps on the map strip', () => {
    render(<MapStrip address={{ street: 'הרצל 12', city: 'תל אביב' }} />);
    expect(screen.getByRole('link', { name: 'Google Maps' }).getAttribute('href')).toBe(googleMapsHref(address));
    expect(screen.getByRole('link', { name: 'Waze' }).getAttribute('href')).toBe(wazeHref(address));
  });

  // LT-368: Erel's Waze brand icon on both, in the link's colour, never read out.
  it('marks both Waze links with the Waze icon', () => {
    render(
      <>
        <WazeLink address={address} />
        <MapStrip address={{ street: 'הרצל 12', city: 'תל אביב' }} />
      </>
    );
    for (const link of [screen.getByRole('link', { name: 'about.waze' }), screen.getByRole('link', { name: 'Waze' })]) {
      const icon = link.querySelector('svg[data-icon="waze"]');
      expect(icon).not.toBeNull();
      expect(icon!.getAttribute('viewBox')).toBe('0 0 14 14');
      expect(icon!.getAttribute('fill')).toBe('currentColor');
      expect(icon!.getAttribute('aria-hidden')).toBe('true');
      // The old arrow is gone.
      expect(link.querySelector('svg.lucide-navigation')).toBeNull();
    }
  });
});
