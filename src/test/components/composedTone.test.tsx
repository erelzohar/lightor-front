import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import ComposedPage from '../../components/blocks/ComposedPage';
import Schedule from '../../components/Layout/Schedule/Schedule';
import { WebsiteConfig } from '../../models/WebsiteConfig';
import { ScheduleConfig } from '../../models/ScheduleConfig';
import { getSiteJitter } from '../../services/seed';
import { RAW_AI_RESPONSE_SHAPE } from '../fixtures/rawAiConfig';

class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
}
vi.stubGlobal('IntersectionObserver', NoopObserver);
Element.prototype.scrollIntoView = vi.fn();

vi.mock('@marsidev/react-turnstile', () => ({ Turnstile: () => null }));
vi.mock('../../services/AuthService', () => ({ default: { handshake: vi.fn().mockResolvedValue(true) } }));
vi.mock('../../services/AppointmentService', () => ({
  default: { getInstance: () => ({ getCalendar: vi.fn().mockResolvedValue({ busy: [], classes: [] }), getAvailability: vi.fn() }) },
}));
vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

const STEPS = [{ title: 'Pick' }, { title: 'Bake' }, { title: 'Collect' }];

const renderBlocks = (blocks: unknown[]) => {
  const config = WebsiteConfig.fromJSON({ ...RAW_AI_RESPONSE_SHAPE, blocks });
  return render(<ComposedPage config={config} jitter={getSiteJitter('tone-test')} isPreview={false} />);
};

const sectionClass = (container: HTMLElement, id: string): string =>
  container.querySelector<HTMLElement>(`#${id}`)?.className ?? '';

/** LT-166 — the schedule takes its tone from the page flow like every other section. */
describe('the schedule section tone in a composed page', () => {
  it('paints the page background when the alternation lands it on a bg slot', () => {
    const { container } = renderBlocks([{ type: 'schedule' }, { type: 'faq' }]);
    expect(sectionClass(container, 'schedule')).toContain('bg-light-bg');
    expect(sectionClass(container, 'schedule')).not.toContain('bg-light-surface');
    expect(sectionClass(container, 'faq')).toContain('bg-light-surface');
  });

  it('paints the surface when the section before it took the background', () => {
    const { container } = renderBlocks([{ type: 'process', props: { steps: STEPS } }, { type: 'schedule' }]);
    expect(container.querySelector('section')?.className).toContain('bg-light-bg');
    expect(sectionClass(container, 'schedule')).toContain('bg-light-surface');
  });

  it('honours a pinned tone and the next section alternates from it', () => {
    const { container } = renderBlocks([{ type: 'schedule', mod: { tone: 'surface' } }, { type: 'faq' }]);
    expect(sectionClass(container, 'schedule')).toContain('bg-light-surface');
    expect(sectionClass(container, 'faq')).toContain('bg-light-bg');
  });

  it('does not let a block that renders nothing advance the alternation', () => {
    // An announcement without text renders null and must not consume the bg slot.
    const { container } = renderBlocks([{ type: 'announcement' }, { type: 'schedule' }]);
    expect(sectionClass(container, 'schedule')).toContain('bg-light-bg');
  });

  it('defaults to the surface outside the composer (legacy flow pins it)', () => {
    const { container } = render(
      <Schedule
        config={new ScheduleConfig('Book', 'Pick')}
        workingDays={Array(7).fill('09:00-17:00') as (string | null)[]}
        user_id="u1"
        phone="+972500000000"
        businessName="Business"
        timeToCancel={0}
        vacations={[]}
        appointmentTypes={[]}
      />
    );
    expect(sectionClass(container, 'schedule')).toContain('bg-light-surface');
  });
});
