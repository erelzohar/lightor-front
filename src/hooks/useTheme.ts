import { useEffect } from 'react';
import { WebsiteConfig } from '../models/WebsiteConfig';

export const useTheme = (config: WebsiteConfig | null) => {
    useEffect(() => {
        if (!config) return;

        const root = document.documentElement;
        const { pallete } = config;

        // Convert hex to RGB
        const hexToRgb = (hex: string) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ?
                `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}` :
                null;
        };

        // Set primary colors
        root.style.setProperty('--color-primary', hexToRgb(pallete.colorPrimary));
        root.style.setProperty('--color-primary-dark', hexToRgb(pallete.colorPrimaryDark));

        // Set light mode colors
        root.style.setProperty('--color-light-bg', hexToRgb(pallete.colorLightBg));
        root.style.setProperty('--color-light-surface', hexToRgb(pallete.colorLightSurface));
        root.style.setProperty('--color-light-gray', hexToRgb(pallete.colorLightGray));
        root.style.setProperty('--color-light-text', hexToRgb(pallete.colorLightText));

        // Set dark mode colors
        root.style.setProperty('--color-dark-bg', hexToRgb(pallete.colorDarkBg));
        root.style.setProperty('--color-dark-surface', hexToRgb(pallete.colorDarkSurface));
        root.style.setProperty('--color-dark-gray', hexToRgb(pallete.colorDarkGray));
        root.style.setProperty('--color-dark-text', hexToRgb(pallete.colorDarkText));

    }, [config]);
};
