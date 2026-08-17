import { describe, it, expect } from 'vitest';
import {
  DesignConfig,
  STYLE_PRESETS,
  type DesignTokens,
  type StylePreset,
} from '../../models/DesignConfig';

const TOKEN_KEYS = [
  'borderRadius', 'cardStyle', 'buttonStyle', 'headingFont', 'bodyFont',
  'animLevel', 'navbarStyle', 'heroLayout', 'sectionDivider', 'density',
  'typeScale', 'headingAccent', 'imageTreatment',
  'aboutLayout', 'portfolioLayout', 'contactLayout', 'footerLayout',
] as const satisfies readonly (keyof DesignTokens)[];

describe('DesignConfig.fromJSON', () => {
  it('expands a bare stylePreset into the full token bundle', () => {
    const cfg = DesignConfig.fromJSON({ stylePreset: 'luxe' });
    expect(cfg.stylePreset).toBe('luxe');
    for (const key of TOKEN_KEYS) {
      expect(cfg[key]).toBe(STYLE_PRESETS.luxe[key]);
    }
  });

  it('lets an explicit token override its preset value', () => {
    const cfg = DesignConfig.fromJSON({ stylePreset: 'luxe', borderRadius: 'full' });
    expect(cfg.borderRadius).toBe('full');
    // Other tokens still come from the preset.
    expect(cfg.headingFont).toBe(STYLE_PRESETS.luxe.headingFont);
    expect(cfg.imageTreatment).toBe(STYLE_PRESETS.luxe.imageTreatment);
  });

  it('falls back to neutral defaults without preset or tokens', () => {
    const cfg = DesignConfig.fromJSON({});
    expect(cfg.stylePreset).toBeNull();
    expect(cfg.headingAccent).toBe('bar');
    expect(cfg.imageTreatment).toBe('rounded');
    expect(cfg.borderRadius).toBe('lg');
  });

  it('honours the legacy single fontFamily field for both heading and body', () => {
    const cfg = DesignConfig.fromJSON({ fontFamily: 'poppins' });
    expect(cfg.headingFont).toBe('poppins');
    expect(cfg.bodyFont).toBe('poppins');
  });

  it('ignores an unknown stylePreset rather than crashing', () => {
    const cfg = DesignConfig.fromJSON({ stylePreset: 'vaporwave' });
    expect(cfg.stylePreset).toBeNull();
    expect(cfg.borderRadius).toBe('lg');
  });

  // The presets exist to guarantee two generated sites look genuinely
  // different. Guard the divergence: every pair must differ on at least
  // three token axes, so no edit quietly collapses two identities.
  it('keeps every pair of presets at least 3 token axes apart', () => {
    const names = Object.keys(STYLE_PRESETS) as StylePreset[];
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const a = STYLE_PRESETS[names[i]];
        const b = STYLE_PRESETS[names[j]];
        const distance = TOKEN_KEYS.filter((key) => a[key] !== b[key]).length;
        expect(
          distance,
          `presets "${names[i]}" and "${names[j]}" differ on only ${distance} axes`
        ).toBeGreaterThanOrEqual(3);
      }
    }
  });
});
