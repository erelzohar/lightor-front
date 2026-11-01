import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Interlude from '../../components/Layout/Interlude';

vi.mock('../../contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'he' }) }));
vi.mock('../../utils/cutout', async (orig) => ({ ...(await orig<typeof import('../../utils/cutout')>()), useCutout: () => false }));

/** LT-510 (Erel): a site never cuts its text with "...", the design makes room for it. */
describe('a long statement', () => {
  const LONG = 'כל פריט נעשה בעבודת יד קפדנית, מתוך שמירה על מתכונים אותנטיים ואסתטיקה נקייה שמתאימה לכל שולחן חג ולכל אירוח, מהמפגש המשפחתי הקטן ועד לאירוע הגדול.';

  it.each([[0], [1]] as const)('variant %i grows with it', (variant) => {
    const { container } = render(<Interlude image="photo.jpg" statement={LONG} variant={variant} />);
    expect(screen.getByText(LONG).className).not.toContain('line-clamp');
    expect(container.innerHTML).not.toMatch(/(^|[\s"])(md:)?h-\[/);
  });
});

describe("the sites' components", () => {
  const sources = import.meta.glob('../../components/**/*.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
  const CUTS = /\b(line-clamp-\d|truncate|text-ellipsis)\b/;

  it('have no class that cuts text with "..."', () => {
    // The dropdown holds form options the server caps at 30 characters.
    const dropdown = '../../components/ui/dropdown.tsx';
    expect(sources[dropdown]).toMatch(CUTS);
    const cutting = Object.keys(sources).filter((file) => file !== dropdown && CUTS.test(sources[file]));
    expect(cutting).toEqual([]);
  });
});
