import { useEffect } from 'react';
import { WebsiteConfig } from '../models/WebsiteConfig';
import type { CardStyle, FontFamily } from '../models/DesignConfig';

const FONT_STACK: Record<FontFamily, string> = {
    inter: "'Inter', sans-serif",
    raleway: "'Raleway', sans-serif",
    playfair: "'Playfair Display', serif",
    montserrat: "'Montserrat', sans-serif",
    poppins: "'Poppins', sans-serif",
};

// Hebrew-capable counterpart per family, so RTL sites keep the preset's
// typographic personality instead of all collapsing to Rubik (LT-039).
// Rubik stays in every stack as the fallback: it covers Arabic, which the
// Hebrew-focused families do not, so Arabic glyphs fall through per-character.
const RTL_HEADING_STACK: Record<FontFamily, string> = {
    inter: "'Heebo', 'Rubik', sans-serif",
    raleway: "'Assistant', 'Rubik', sans-serif",
    playfair: "'Frank Ruhl Libre', 'Rubik', serif",
    montserrat: "'Secular One', 'Rubik', sans-serif",
    poppins: "'Rubik', sans-serif",
};

// Secular One is display-only (single weight), so montserrat bodies get Heebo.
const RTL_BODY_STACK: Record<FontFamily, string> = {
    inter: "'Heebo', 'Rubik', sans-serif",
    raleway: "'Assistant', 'Rubik', sans-serif",
    playfair: "'Frank Ruhl Libre', 'Rubik', serif",
    montserrat: "'Heebo', 'Rubik', sans-serif",
    poppins: "'Rubik', sans-serif",
};

// Card style → CSS-var bundle. `bgOpacity` < 1 is what makes "glass" read as
// translucent over the blurred backdrop.
const CARD_STYLES: Record<CardStyle, {
    shadow: string; borderWidth: string; borderColor: string; blur: string; bgOpacity: string;
}> = {
    flat:     { shadow: 'none',                          borderWidth: '0px', borderColor: 'transparent',          blur: '0px',  bgOpacity: '1' },
    elevated: { shadow: '0 4px 24px 0 rgba(0,0,0,0.10)', borderWidth: '0px', borderColor: 'transparent',          blur: '0px',  bgOpacity: '1' },
    glass:    { shadow: '0 4px 24px 0 rgba(0,0,0,0.08)', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.18)', blur: '12px', bgOpacity: '0.55' },
    bordered: { shadow: 'none',                          borderWidth: '1px', borderColor: 'rgba(128,128,128,0.25)', blur: '0px',  bgOpacity: '1' },
};

export const useTheme = (config: WebsiteConfig | null) => {
    useEffect(() => {
        if (!config) return;

        const root = document.documentElement;
        const { pallete, design } = config;

        const hexToRgb = (hex: string) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result
                ? `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`
                : null;
        };

        // Palette colors
        root.style.setProperty('--color-primary', hexToRgb(pallete.colorPrimary));
        root.style.setProperty('--color-primary-dark', hexToRgb(pallete.colorPrimaryDark));
        root.style.setProperty('--color-light-bg', hexToRgb(pallete.colorLightBg));
        root.style.setProperty('--color-light-surface', hexToRgb(pallete.colorLightSurface));
        root.style.setProperty('--color-light-gray', hexToRgb(pallete.colorLightGray));
        root.style.setProperty('--color-light-text', hexToRgb(pallete.colorLightText));
        root.style.setProperty('--color-dark-bg', hexToRgb(pallete.colorDarkBg));
        root.style.setProperty('--color-dark-surface', hexToRgb(pallete.colorDarkSurface));
        root.style.setProperty('--color-dark-gray', hexToRgb(pallete.colorDarkGray));
        root.style.setProperty('--color-dark-text', hexToRgb(pallete.colorDarkText));

        if (!design) return;

        // Border radius
        const radiusMap: Record<string, string> = {
            none: '0px', sm: '0.25rem', md: '0.5rem', lg: '1rem', xl: '1.5rem', full: '9999px',
        };
        root.style.setProperty('--radius', radiusMap[design.borderRadius] ?? '1rem');

        // Card style
        const card = CARD_STYLES[design.cardStyle] ?? CARD_STYLES.elevated;
        root.style.setProperty('--card-shadow', card.shadow);
        root.style.setProperty('--card-border-width', card.borderWidth);
        root.style.setProperty('--card-border-color', card.borderColor);
        root.style.setProperty('--card-blur', card.blur);
        root.style.setProperty('--card-bg-opacity', card.bgOpacity);

        // Font pairing — heading and body resolved independently, with a
        // parallel RTL pair consumed by the [dir="rtl"] rules in index.css.
        root.style.setProperty('--font-heading', FONT_STACK[design.headingFont] ?? FONT_STACK.raleway);
        root.style.setProperty('--font-body', FONT_STACK[design.bodyFont] ?? FONT_STACK.inter);
        root.style.setProperty('--font-heading-rtl', RTL_HEADING_STACK[design.headingFont] ?? RTL_HEADING_STACK.raleway);
        root.style.setProperty('--font-body-rtl', RTL_BODY_STACK[design.bodyFont] ?? RTL_BODY_STACK.inter);

        // Animation duration
        const animDurationMap: Record<string, string> = { none: '0s', minimal: '0.15s', full: '0.6s' };
        root.style.setProperty('--anim-duration', animDurationMap[design.animLevel] ?? '0.6s');

        // Density + type scale drive whitespace and heading sizes via CSS hooks.
        root.dataset.density = design.density;
        root.dataset.typeScale = design.typeScale;

        // Heading accent shape — consumed by the .heading-accent rules.
        root.dataset.headingAccent = design.headingAccent ?? 'bar';

    }, [config]);
};
