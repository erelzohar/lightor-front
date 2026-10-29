import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SocialTiles from '../../components/blocks/SocialTiles';
import type { Social } from '../../models/Social';

vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'he' }),
}));

// LT-484: the social tiles section was named "Social" in English for screen
// readers on every site; it says "follow us" in the site's language now.
describe('social tiles - their name for screen readers', () => {
  it("is the site's language, through i18n", () => {
    render(<SocialTiles social={{ instagram: 'https://instagram.com/dana', facebook: null, x: null, tiktok: null } as Social} />);
    expect(screen.getByRole('region', { name: 'footer.follow' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Social' })).toBeNull();
  });
});
