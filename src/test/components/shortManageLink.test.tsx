import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import ShortManageLink from '../../components/ShortManageLink';
import AppointmentService from '../../services/AppointmentService';

vi.mock('../../components/NotFound', () => ({ default: () => <div>not-found</div> }));
vi.mock('../../components/Loading', () => ({ default: () => <div>loading</div> }));

/** The manage page's stand-in: shows where the short link landed. */
const Landing = () => {
  const location = useLocation();
  return <div data-testid="landed">{location.pathname + location.search}</div>;
};

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/m/:code" element={<ShortManageLink />} />
        <Route path="/manage/:appointment-id" element={<Landing />} />
      </Routes>
    </MemoryRouter>
  );

describe('the short manage link /m/:code (LT-336)', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('opens the manage page of the booking the code names, with its token', async () => {
    const resolve = vi
      .spyOn(AppointmentService.getInstance(), 'resolveManageCode')
      .mockResolvedValue({ appointmentId: '66f1a2b3c4d5e6f7a8b9c0d1', manageToken: 'tok.en/+=' });

    renderAt('/m/k7Qx2mPa9Z');

    expect(screen.getByText('loading')).toBeTruthy();
    await waitFor(() =>
      expect(screen.getByTestId('landed').textContent).toBe(
        `/manage/66f1a2b3c4d5e6f7a8b9c0d1?manageToken=${encodeURIComponent('tok.en/+=')}`
      )
    );
    expect(resolve).toHaveBeenCalledWith('k7Qx2mPa9Z');
  });

  it("shows the site's not-found page for a code that names nothing", async () => {
    vi.spyOn(AppointmentService.getInstance(), 'resolveManageCode').mockResolvedValue(null);

    renderAt('/m/ZZZZZZZZZZ');

    await waitFor(() => expect(screen.getByText('not-found')).toBeTruthy());
  });
});
