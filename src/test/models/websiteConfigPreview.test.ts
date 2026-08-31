import { describe, it, expect } from 'vitest';
import { WebsiteConfig } from '../../models/WebsiteConfig';
import { STYLE_PRESETS } from '../../models/DesignConfig';

// LT-104 regression: the register onboarding preview posts the RAW AI
// response, which has no `vacations` (and its appointmentTypes are AI-shaped,
// not DB refs). fromJSON must parse that payload — an unguarded
// `json.vacations.map` used to throw, App's catch fell back to the unparsed
// object, and the stylePreset silently never expanded: every onboarding
// preview rendered the generic default look while the saved site rendered
// its real design.
const RAW_AI_RESPONSE_SHAPE = {
  businessName: 'הזקן והתער',
  logoImageName: 'https://picsum.photos/seed/x/400/400',
  subDomain: 'test-barber',
  minCancelTimeMS: 3600000,
  defaultLanguage: 'he',
  workingDays: [null, '09:00-17:00', '09:00-17:00', '09:00-17:00', '09:00-17:00', '09:00-17:00', null],
  address: { state: '', city: '', street: '', other: '' },
  contact: { phone: '050-0000000', mail: 'a@b.co' },
  social: { instagram: '', facebook: '', tiktok: '' },
  pallete: {
    colorPrimary: '#8e731e', colorPrimaryDark: '#B8860B',
    colorLightBg: '#FFFFFF', colorLightSurface: '#F8F9FA', colorLightGray: '#E0E0E0', colorLightText: '#1A1A1A',
    colorDarkBg: '#0A0A0A', colorDarkSurface: '#121212', colorDarkGray: '#333333', colorDarkText: '#F0F0F0',
  },
  components: {
    navbar: { visible: true, darkMode: true, languageSwitcher: false },
    hero: { visible: true, title: 't', subtitle: 's', description: 'd', heroImageSrc: 'https://x/y.jpg', bgType: 'fog', bordersType: 'square' },
    about: { visible: true, title: 't', description: 'd', paragraphs: { intro: 'i', mission: 'm' }, features: [] },
    portfolio: { visible: true, isGrid: true, title: 't', description: 'd', items: [] },
    schedule: { title: 't', description: 'd' },
    contact: { visible: true, title: 't', description: 'd' },
    footer: { visible: true, description: 'd' },
    introPopup: { visible: false, value: '' },
    contactButton: { visible: true },
    faq: { visible: true, title: 'שאלות', items: [{ question: 'q', answer: 'a' }] },
    testimonials: { visible: false, title: 't', items: [] },
  },
  design: { heroLayout: 'split', stylePreset: 'industrial' },
  // NOTE: no `vacations` key — that's the point.
  appointmentTypes: [{ _id: 's1', name: 'תספורת', price: '100 ₪', durationMS: 2400000 }],
};

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
