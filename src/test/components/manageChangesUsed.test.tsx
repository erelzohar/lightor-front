import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ManageAppointment from '../../components/ManageAppointment';
import { Appointment } from '../../models/Appointment';
import { WebsiteConfig } from '../../models/WebsiteConfig';
import { RAW_AI_RESPONSE_SHAPE } from '../fixtures/rawAiConfig';

/**
 * LT-466 (A2b): once the link's changes are used up the page says to call
 * the business at once, with the call button, and offers no change - not
 * after the time, the phone and a code. Cancelling stays.
 */

const mocks = vi.hoisted(() => ({ getAppointmentById: vi.fn(), getWebConfig: vi.fn() }));

vi.mock('../../services/AppointmentService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/AppointmentService')>()),
  default: { getInstance: () => ({ getAppointmentById: mocks.getAppointmentById, getCalendar: vi.fn(), getAvailability: vi.fn() }) },
}));
vi.mock('../../services/WebConfigService', () => ({ default: { getInstance: () => ({ getWebConfig: mocks.getWebConfig }) } }));
vi.mock('../../hooks/useTheme', () => ({ useTheme: () => {} }));
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useParams: () => ({ 'appointment-id': 'a1' }),
  useNavigate: () => vi.fn(),
}));
vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) => (params ? `${key} ${Object.values(params).join(' ')}` : key),
    language: 'he',
    setContentLanguage: () => {},
  }),
}));

const booking = (changesLeft?: number) =>
  Appointment.fromJSON({
    _id: 'a1', user_id: 'u1', type: { _id: 's1', name: 'Haircut', durationMS: '2400000' },
    name: 'Dana', status: 'scheduled', phone: '0501234567', timestamp: String(Date.now() + 5 * 86_400_000), channelType: 'sms',
    ...(changesLeft === undefined ? {} : { changesLeft }),
  });

describe('the manage page with the link`s changes used up (LT-466)', () => {
  beforeEach(() => {
    mocks.getWebConfig.mockResolvedValue(
      WebsiteConfig.fromJSON({ ...RAW_AI_RESPONSE_SHAPE, contact: { ...(RAW_AI_RESPONSE_SHAPE as { contact?: object }).contact, phone: '+972541234567' } })
    );
  });

  it('says to call the business up front, with the call button, and offers no change; cancel stays', async () => {
    mocks.getAppointmentById.mockResolvedValue(booking(0));
    render(<ManageAppointment />);
    expect(await screen.findByText('schedule.error.changesLimit')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /contact.modal.button_call/ })).toHaveAttribute('href', expect.stringMatching(/^tel:/));
    expect(screen.queryByText('manage.button.update')).toBeNull();
    expect(screen.getByText('manage.button.cancel')).toBeInTheDocument();
  });

  it('with changes left, or when the server does not say, the change is offered as before', async () => {
    for (const left of [2, undefined]) {
      mocks.getAppointmentById.mockResolvedValue(booking(left));
      const { unmount } = render(<ManageAppointment />);
      expect(await screen.findByText('manage.button.update')).toBeInTheDocument();
      expect(screen.queryByText('schedule.error.changesLimit')).toBeNull();
      unmount();
    }
  });
});
