import React from 'react';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import type { AppointmentType } from '../../models/AppointmentType';
import type { SectionTone } from '../SectionDivider';
import { TONE_BG } from './blockUtils';

interface Props { appointmentTypes: AppointmentType[]; tone?: SectionTone; title?: string }

const minutes = (ms: string | number | undefined): number | null => {
  const n = Number(ms);
  return Number.isFinite(n) && n > 0 ? Math.round(n / 60000) : null;
};

/** LT-136: services as cards with duration and price; the first is highlighted. */
const PriceCards: React.FC<Props> = ({ appointmentTypes, tone = 'bg', title }) => {
  const { t, language } = useLanguage();
  const rows = (appointmentTypes ?? []).filter((a) => a?.name).slice(0, 6);
  if (!rows.length) return null;
  const price = (p?: string) => (!p?.trim() ? '' : /^\d+(\.\d+)?$/.test(p.trim()) ? `₪${p.trim()}` : p.trim());
  return (
    <section id="services" className={`section-y ${TONE_BG[tone]} transition-colors duration-300`} aria-label={title || t('services.ledger_title', { defaultValue: language === 'he' ? 'המחירון' : 'Services' })}>
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-bold text-light-text dark:text-dark-text mb-12">
          {title || t('services.ledger_title', { defaultValue: language === 'he' ? 'המחירון' : 'Services' })}
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {rows.map((a, i) => {
            const mins = minutes(a.durationMS);
            const featured = i === 0;
            return (
              <motion.a
                key={a._id ?? i}
                href="#schedule"
                className={`block rounded-design-card p-7 transition-transform hover:-translate-y-1 ${featured ? 'bg-primary dark:bg-primary-dark text-on-primary dark:text-on-primary-dark shadow-card' : 'card-design'}`}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
              >
                <h3 className="text-xl font-semibold mb-4">{a.name}</h3>
                <div className={`text-3xl font-bold ${featured ? '' : 'text-light-text dark:text-dark-text'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>{price(a.price)}</div>
                {mins && (
                  <div className={`mt-3 flex items-center gap-2 text-sm ${featured ? 'opacity-90' : 'text-light-text/70 dark:text-dark-text/70'}`}>
                    <Clock className="h-4 w-4" aria-hidden="true" />
                    <span>{mins} {t('time.minutes', { defaultValue: language === 'he' ? "דק'" : 'min' })}</span>
                  </div>
                )}
              </motion.a>
            );
          })}
        </div>
      </div>
    </section>
  );
};
export default PriceCards;
