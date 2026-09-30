/**
 * Google's attribution under address suggestions shown without a map
 * (LT-207). Google asks for the Google Maps logo where it can be shown, and
 * allows the text "Google Maps" where space is limited — unmodified and
 * untranslated, in a plain sans-serif at weight 400, 12–16px, #5E5E5E on a
 * light background and white on a dark one. It used to inherit the
 * tenant's font (a serif or a monospace on some sites) and colour, which the
 * rule does not allow. This is the text form; the official logo replaces it
 * here, in one place, once it is in the repo. The dashboard carries the same
 * component (lightor-dashboard src/components/ui/GoogleMapsLogo.tsx).
 */
export const GoogleMapsLogo = () => (
  <span
    translate="no"
    role="img"
    aria-label="Google Maps"
    className="whitespace-nowrap text-xs font-normal text-[#5E5E5E] dark:text-white"
    style={{ fontFamily: 'Roboto, Arial, sans-serif' }}
  >
    Google Maps
  </span>
);
