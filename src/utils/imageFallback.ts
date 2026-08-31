import type { SyntheticEvent } from 'react';

// Fallbacks for AI-generated placeholder images (picsum.photos), which is a
// hobby service with outages. Inline data URIs so the fallback itself has no
// network dependency — a second remote placeholder host can go down the same
// way. Neutral gray also avoids putting Lightor branding (/lightor.png) on a
// customer's site.
const svgDataUri = (svg: string): string =>
  `data:image/svg+xml,${encodeURIComponent(svg)}`;

export const FALLBACK_IMAGE_WIDE = svgDataUri(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">' +
  '<rect width="800" height="600" fill="#e2e8f0"/>' +
  '<circle cx="340" cy="240" r="36" fill="#94a3b8"/>' +
  '<path d="M240 400 L340 300 L420 380 L480 330 L560 400 Z" fill="#94a3b8"/>' +
  '</svg>'
);

export const FALLBACK_IMAGE_SQUARE = svgDataUri(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">' +
  '<rect width="400" height="400" fill="#e2e8f0"/>' +
  '<circle cx="170" cy="160" r="22" fill="#94a3b8"/>' +
  '<path d="M110 260 L175 195 L220 245 L255 213 L290 260 Z" fill="#94a3b8"/>' +
  '</svg>'
);

// React delegates events, so nulling img.onerror does not detach the handler;
// the src equality check is what actually breaks a potential error loop.
const swapToFallback = (fallback: string) =>
  (e: SyntheticEvent<HTMLImageElement>): void => {
    const img = e.currentTarget;
    if (img.src === fallback) return;
    img.src = fallback;
  };

export const handleWideImageError = swapToFallback(FALLBACK_IMAGE_WIDE);
export const handleSquareImageError = swapToFallback(FALLBACK_IMAGE_SQUARE);
