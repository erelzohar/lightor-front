import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppointmentService from '../services/AppointmentService';
import Loading from './Loading';
import NotFound from './NotFound';

/**
 * `/m/<code>` — the short link the SMS carries since LT-336 (the long one,
 * with a ~200-character token, cost 7 billed messages a confirmation). Asks
 * the API which booking the code names, then opens the manage page as the
 * long link did; old long links still land there directly. A code that
 * resolves to nothing shows the site's not-found page.
 */
const ShortManageLink: React.FC = () => {
  const { code = '' } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    void AppointmentService.getInstance()
      .resolveManageCode(code)
      .then((resolved) => {
        if (!live) return;
        if (!resolved) {
          setFailed(true);
          return;
        }
        navigate(
          `/manage/${resolved.appointmentId}?manageToken=${encodeURIComponent(resolved.manageToken)}`,
          { replace: true }
        );
      });
    return () => {
      live = false;
    };
  }, [code, navigate]);

  return failed ? <NotFound /> : <Loading isLoading={true} />;
};

export default ShortManageLink;
