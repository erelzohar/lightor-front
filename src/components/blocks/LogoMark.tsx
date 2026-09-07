import React from 'react';
import ImagesService from '../../services/ImagesService';
import { handleSquareImageError } from '../../utils/imageFallback';

interface Props { logo: string; businessName: string }

/** LT-136: the logo alone on a color field — a breather between dense blocks. */
const LogoMark: React.FC<Props> = ({ logo, businessName }) => (
  <section className="bg-primary dark:bg-primary-dark py-16 md:py-24 flex items-center justify-center transition-colors duration-300" aria-label={businessName}>
    <img src={ImagesService.getInstance().getImage(logo)} alt={businessName} onError={handleSquareImageError} className="h-28 w-28 md:h-40 md:w-40 rounded-full object-cover ring-4 ring-white/40 shadow-xl" loading="lazy" />
  </section>
);
export default LogoMark;
