import { describe, it, expect } from 'vitest';
import { WebsiteConfig } from '../../models/WebsiteConfig';
import { RAW_AI_RESPONSE_SHAPE } from '../fixtures/rawAiConfig';
import { STYLE_PRESETS } from '../../models/DesignConfig';
import { keyPreviewQuestions } from '../../models/BookingField';

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

// LT-202 (Erel 2026-09-28): "a used-car business … a form of name, phone,
// location, the car's hand and the car type" built that form, but the preview
// showed name and phone only — the AI's questions have no server key until the
// site is saved, and a keyless question is dropped by the parser.
describe('the AI\'s proposed questions in a preview', () => {
  const proposed = {
    ...(RAW_AI_RESPONSE_SHAPE as Record<string, unknown>),
    conversion: 'lead',
    leadFields: [
      { label: 'מיקום', type: 'text', required: true },
      { label: 'יד הרכב', type: 'text', required: true },
      { label: 'סוג הרכב', type: 'choice', options: ['פרטי', 'מסחרי'] },
    ],
    bookingFields: [{ label: 'Your address', type: 'address', required: true }],
  };

  it('shows every one, each with a key of its own', () => {
    const cfg = WebsiteConfig.fromJSON(keyPreviewQuestions(proposed));
    expect(cfg.leadFields.map((f) => f.label)).toEqual(['מיקום', 'יד הרכב', 'סוג הרכב']);
    expect(new Set(cfg.leadFields.map((f) => f.key)).size).toBe(3);
    expect(cfg.leadFields[2].options).toEqual(['פרטי', 'מסחרי']);
    expect(cfg.bookingFields.map((f) => f.label)).toEqual(['Your address']);
  });

  it("keeps a stored question's own key, and leaves a config without questions alone", () => {
    const keyed = keyPreviewQuestions({ leadFields: [{ key: 'kind-of-job', label: 'Kind of job', type: 'text' }] });
    expect(keyed.leadFields).toEqual([{ key: 'kind-of-job', label: 'Kind of job', type: 'text' }]);
    expect(keyPreviewQuestions({ businessName: 'x' })).toEqual({ businessName: 'x' });
    expect(keyPreviewQuestions(null)).toBeNull();
  });

  it('a saved site still needs the server\'s key', () => {
    expect(WebsiteConfig.fromJSON(proposed).leadFields).toEqual([]);
  });
});
