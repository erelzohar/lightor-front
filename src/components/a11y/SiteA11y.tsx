import React, { useEffect } from 'react';
import { useLanguage, type Language } from '../../contexts/LanguageContext';
import { WebsiteConfig } from '../../models/WebsiteConfig';
import { setA11yMenuEnabled } from '../../services/a11yPrefs';
import { takesBookings } from '../../services/siteMode';
import AccessibilityMenu from './AccessibilityMenu';
import AccessibilityStatement from './AccessibilityStatement';
import LightorBadge from '../LightorBadge';

/**
 * LT-356: the accessibility menu, the statement and the statement's link for
 * a site page that is not the main page — the booking a customer manages from
 * the link in their message. The main page wires the same parts itself
 * (App.tsx), around its own footer and contact button.
 */
const SiteA11y: React.FC<{ config: WebsiteConfig }> = ({ config }) => {
  const { setContentLanguage } = useLanguage();
  useEffect(() => {
    setContentLanguage?.((config.defaultLanguage as Language) || null);
    setA11yMenuEnabled(config.accessibilityMenu !== false);
  }, [config, setContentLanguage]);

  return (
    <>
      <LightorBadge badge={false} statementLink />
      {config.accessibilityMenu !== false && <AccessibilityMenu aboveContactButton={false} />}
      <AccessibilityStatement
        businessName={config.businessName}
        phone={config.contact?.phone}
        bookable={takesBookings(config.conversion, config.appointmentTypes)}
      />
    </>
  );
};

export default SiteA11y;
