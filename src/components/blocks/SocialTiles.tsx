import React from 'react';
import { Instagram, Facebook, Music2, Twitter } from 'lucide-react';
import type { Social } from '../../models/Social';
import type { SectionTone } from '../SectionDivider';
import { TONE_BG } from './blockUtils';

interface Props { social: Social; tone?: SectionTone }

/** LT-136: social handles as large tiles — the closer on image-led sites. */
const SocialTiles: React.FC<Props> = ({ social, tone = 'bg' }) => {
  const links = [
    social.instagram && { href: social.instagram, label: 'Instagram', Icon: Instagram },
    social.tiktok && { href: social.tiktok, label: 'TikTok', Icon: Music2 },
    social.facebook && { href: social.facebook, label: 'Facebook', Icon: Facebook },
    social.x && { href: social.x, label: 'X', Icon: Twitter },
  ].filter((l): l is { href: string; label: string; Icon: typeof Instagram } => !!l);
  if (!links.length) return null;
  return (
    <section className={`section-y ${TONE_BG[tone]} transition-colors duration-300`} aria-label="Social">
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
