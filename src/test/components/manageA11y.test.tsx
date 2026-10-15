import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ManageAppointment from '../../components/ManageAppointment';
import { Appointment } from '../../models/Appointment';
import { WebsiteConfig } from '../../models/WebsiteConfig';
import { RAW_AI_RESPONSE_SHAPE } from '../fixtures/rawAiConfig';

/**
 * LT-356 — the page a customer reaches from the link in their message has
 * the site's accessibility menu, the statement and its link, a main landmark
 * and a page heading; "cancel this booking?" is a real dialog.
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

const site = (extra: Record<string, unknown> = {}) => WebsiteConfig.fromJSON({ ...RAW_AI_RESPONSE_SHAPE, ...extra });

describe('the manage-booking page (LT-356)', () => {
  beforeEach(() => {
    mocks.getAppointmentById.mockResolvedValue(Appointment.fromJSON({
      _id: 'a1', user_id: 'u1', type: { _id: 's1', name: 'Haircut', durationMS: '2400000' },
      name: 'Dana', status: 'scheduled', phone: '0501234567', timestamp: String(Date.now() + 5 * 86_400_000), channelType: 'sms',
    }));
    mocks.getWebConfig.mockResolvedValue(site());
  });

  it('has the menu, the statement link, a main landmark and a page heading', async () => {
    render(<ManageAppointment />);
    expect(await screen.findByRole('heading', { level: 1, name: 'manage.manage_title' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'a11y.menu.button' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'a11y.menu.statement' })).toHaveAttribute('href', '#accessibility');
  });

  it('keeps the statement link when the owner hid the menu', async () => {
    mocks.getWebConfig.mockResolvedValue(site({ accessibility: { widgetHidden: true } }));
    render(<ManageAppointment />);
    expect(await screen.findByRole('link', { name: 'a11y.menu.statement' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'a11y.menu.button' })).toBeNull();
  });

  it('asks "cancel this booking?" in a real dialog', async () => {
    render(<ManageAppointment />);
    fireEvent.click(await screen.findByText('manage.button.cancel'));
    const dialog = screen.getByRole('alertdialog', { name: 'manage.modal.confirm.title' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog.contains(document.activeElement)).toBe(true);
  });
});
