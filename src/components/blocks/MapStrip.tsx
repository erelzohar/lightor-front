import React from 'react';
import { MapPin } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import type { SectionTone } from '../SectionDivider';
import { TONE_BG } from './blockUtils';

interface Address { street?: string; other?: string; city?: string; state?: string }
interface Props { address: Address; tone?: SectionTone }

/** LT-136: the address as a wide strip with a map tile. */
const MapStrip: React.FC<Props> = ({ address, tone = 'surface' }) => {
  const { t } = useLanguage();
  const line1 = [address.street, address.other].map((p) => p?.trim()).filter(Boolean).join(', ');
  const line2 = [address.city, address.state].map((p) => p?.trim()).filter(Boolean).join(', ');
  const full = [line1, line2].filter(Boolean).join(', ');
  if (!full) return null;
  const href = `https://maps.google.com/?q=${encodeURIComponent(full)}`;
  return (
    <section className={`${TONE_BG[tone]} border-y border-light-text/15 dark:border-dark-text/15 transition-colors duration-300`} aria-label={t('about.location')}>
      <div className="container mx-auto px-4 py-10 grid md:grid-cols-[1fr_auto] gap-8 items-center">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-primary-readable dark:text-primary-dark-readable mb-3">{t('about.location')}</div>
          <div className="text-2xl md:text-3xl font-bold text-light-text dark:text-dark-text">{line1}</div>
          {line2 && <div className="text-lg text-light-text/70 dark:text-dark-text/70 mt-1">{line2}</div>}
        </div>
        <a href={href} target="_blank" rel="noopener noreferrer" className="h-32 w-full md:w-64 rounded-design-sm bg-light-gray/40 dark:bg-dark-gray/40 flex items-center justify-center gap-3 text-light-text/70 dark:text-dark-text/70 hover:text-primary-readable dark:hover:text-primary-dark-readable transition-colors">
          <MapPin className="h-8 w-8" aria-hidden="true" />
          <span className="font-semibold">Google Maps</span>
        </a>
      </div>
    </section>
  );
};
export default MapStrip;
