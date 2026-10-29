import React from 'react';
import { Instagram, Facebook, Music2, Twitter } from 'lucide-react';
import type { Social } from '../../models/Social';
import type { SectionTone } from '../SectionDivider';
import { TONE_BG } from './blockUtils';
import { safeHttpUrl } from '../../utils/safeUrl';
import { useLanguage } from '../../contexts/LanguageContext';

interface Props { social: Social; tone?: SectionTone }

/** LT-136: social handles as large tiles — the closer on image-led sites. */
const SocialTiles: React.FC<Props> = ({ social, tone = 'bg' }) => {
  const { t } = useLanguage();
  // http(s) only (LT-315): a `javascript:` link the owner saved is dropped.
  const links = [
    { href: safeHttpUrl(social.instagram), label: 'Instagram', Icon: Instagram },
    { href: safeHttpUrl(social.tiktok), label: 'TikTok', Icon: Music2 },
    { href: safeHttpUrl(social.facebook), label: 'Facebook', Icon: Facebook },
    { href: safeHttpUrl(social.x), label: 'X', Icon: Twitter },
  ].filter((l): l is { href: string; label: string; Icon: typeof Instagram } => !!l.href);
  if (!links.length) return null;
  return (
    <section className={`section-y ${TONE_BG[tone]} transition-colors duration-300`} aria-label={t('footer.follow')}>
      <div className={`container mx-auto px-4 grid gap-4 ${links.length === 1 ? 'max-w-md' : links.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-4'}`}>
        {links.map((l) => (
          <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="card-design p-8 flex items-center justify-center gap-4 text-xl font-semibold text-light-text dark:text-dark-text hover:text-primary-readable dark:hover:text-primary-dark-readable transition-colors">
            <l.Icon className="h-7 w-7" aria-hidden="true" />
            <span>{l.label}</span>
          </a>
        ))}
      </div>
    </section>
  );
};
export default SocialTiles;
