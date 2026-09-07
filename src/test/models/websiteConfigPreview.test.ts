import { describe, it, expect } from 'vitest';
import { WebsiteConfig } from '../../models/WebsiteConfig';
import { RAW_AI_RESPONSE_SHAPE } from '../fixtures/rawAiConfig';
import { STYLE_PRESETS } from '../../models/DesignConfig';

// LT-104 regression: the register onboarding preview posts the RAW AI
// response, which has no `vacations` (and its appointmentTypes are AI-shaped,
// not DB refs). fromJSON must parse that payload — an unguarded
// `json.vacations.map` used to throw, App's catch fell back to the unparsed
// object, and the stylePreset silently never expanded: every onboarding
// preview rendered the generic default look while the saved site rendered
// its real design.

describe('WebsiteConfig.fromJSON on a raw AI onboarding response', () => {
  it('parses without vacations and expands the stylePreset', () => {
    const cfg = WebsiteConfig.fromJSON(RAW_AI_RESPONSE_SHAPE);
    expect(cfg.vacations).toEqual([]);
    expect(cfg.design.stylePreset).toBe('industrial');
    // The whole point: the preview must get the EXPANDED token bundle.
    expect(cfg.design.headingFont).toBe(STYLE_PRESETS.industrial.headingFont);
    expect(cfg.design.defaultTheme).toBe('dark');
    expect(cfg.design.faqStyle).toBe(STYLE_PRESETS.industrial.faqStyle);
    // The explicit heroLayout override survives expansion.
    expect(cfg.design.heroLayout).toBe('split');
  });

  it('parses without appointmentTypes either', () => {
    const { appointmentTypes: _a, ...noTypes } = RAW_AI_RESPONSE_SHAPE as Record<string, unknown>;
    const cfg = WebsiteConfig.fromJSON(noTypes);
    expect(cfg.appointmentTypes).toEqual([]);
    expect(cfg.design.stylePreset).toBe('industrial');
  });
});
