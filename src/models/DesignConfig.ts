export type BorderRadius = 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
export type CardStyle = 'flat' | 'elevated' | 'glass' | 'bordered';
export type ButtonStyle = 'solid' | 'gradient' | 'outline' | 'ghost';
export type FontFamily = 'inter' | 'raleway' | 'playfair' | 'montserrat' | 'poppins';
export type AnimLevel = 'none' | 'minimal' | 'full';
export type NavbarStyle = 'floating' | 'solid' | 'transparent';
export type HeroLayout = 'image-right' | 'centered' | 'split';
export type SectionDivider = 'none' | 'wave' | 'diagonal' | 'curve';
export type Density = 'compact' | 'comfortable' | 'spacious';
export type TypeScale = 'modest' | 'balanced' | 'dramatic';
export type HeadingAccent = 'bar' | 'rule' | 'dot' | 'none';
export type ImageTreatment = 'rounded' | 'circle' | 'arch' | 'blob' | 'framed';

export type StylePreset =
  | 'luxe'
  | 'editorial'
  | 'boldStartup'
  | 'corporate'
  | 'playful'
  | 'minimal'
  | 'warmOrganic'
  | 'brutalist'
  | 'boutique'
  | 'bistro';

// The concrete set of tokens that actually drives rendering.
export interface DesignTokens {
  borderRadius: BorderRadius;
  cardStyle: CardStyle;
  buttonStyle: ButtonStyle;
  headingFont: FontFamily;
  bodyFont: FontFamily;
  animLevel: AnimLevel;
  navbarStyle: NavbarStyle;
  heroLayout: HeroLayout;
  sectionDivider: SectionDivider;
  density: Density;
  typeScale: TypeScale;
  headingAccent: HeadingAccent;
  imageTreatment: ImageTreatment;
}

// Neutral fallback used when no preset and no explicit tokens are provided.
const DEFAULT_TOKENS: DesignTokens = {
  borderRadius: 'lg',
  cardStyle: 'elevated',
  buttonStyle: 'gradient',
  headingFont: 'raleway',
  bodyFont: 'inter',
  animLevel: 'full',
  navbarStyle: 'floating',
  heroLayout: 'image-right',
  sectionDivider: 'none',
  density: 'comfortable',
  typeScale: 'balanced',
  headingAccent: 'bar',
  imageTreatment: 'rounded',
};

// Opinionated, deliberately divergent bundles. Picking one of these gives a
// coherent identity AND guarantees two sites look genuinely different — the
// presets are engineered to differ across every axis, not just color.
export const STYLE_PRESETS: Record<StylePreset, DesignTokens> = {
  luxe: {
    borderRadius: 'none', cardStyle: 'bordered', buttonStyle: 'outline',
    headingFont: 'playfair', bodyFont: 'raleway', animLevel: 'minimal',
    navbarStyle: 'transparent', heroLayout: 'centered', sectionDivider: 'curve',
    density: 'spacious', typeScale: 'dramatic',
    headingAccent: 'rule', imageTreatment: 'arch',
  },
  editorial: {
    borderRadius: 'none', cardStyle: 'flat', buttonStyle: 'ghost',
    headingFont: 'playfair', bodyFont: 'inter', animLevel: 'minimal',
    navbarStyle: 'solid', heroLayout: 'split', sectionDivider: 'none',
    density: 'spacious', typeScale: 'dramatic',
    headingAccent: 'rule', imageTreatment: 'framed',
  },
  boldStartup: {
    borderRadius: 'lg', cardStyle: 'glass', buttonStyle: 'gradient',
    headingFont: 'montserrat', bodyFont: 'inter', animLevel: 'full',
    navbarStyle: 'floating', heroLayout: 'split', sectionDivider: 'diagonal',
    density: 'comfortable', typeScale: 'balanced',
    headingAccent: 'bar', imageTreatment: 'rounded',
  },
  corporate: {
    borderRadius: 'sm', cardStyle: 'bordered', buttonStyle: 'solid',
    headingFont: 'inter', bodyFont: 'inter', animLevel: 'minimal',
    navbarStyle: 'solid', heroLayout: 'image-right', sectionDivider: 'none',
    density: 'compact', typeScale: 'modest',
    headingAccent: 'bar', imageTreatment: 'rounded',
  },
  playful: {
    borderRadius: 'full', cardStyle: 'elevated', buttonStyle: 'gradient',
    headingFont: 'poppins', bodyFont: 'poppins', animLevel: 'full',
    navbarStyle: 'floating', heroLayout: 'centered', sectionDivider: 'wave',
    density: 'comfortable', typeScale: 'balanced',
    headingAccent: 'dot', imageTreatment: 'blob',
  },
  minimal: {
    borderRadius: 'none', cardStyle: 'flat', buttonStyle: 'outline',
    headingFont: 'inter', bodyFont: 'inter', animLevel: 'none',
    navbarStyle: 'transparent', heroLayout: 'image-right', sectionDivider: 'none',
    density: 'spacious', typeScale: 'balanced',
    headingAccent: 'none', imageTreatment: 'rounded',
  },
  warmOrganic: {
    borderRadius: 'xl', cardStyle: 'elevated', buttonStyle: 'solid',
    headingFont: 'raleway', bodyFont: 'poppins', animLevel: 'minimal',
    navbarStyle: 'floating', heroLayout: 'image-right', sectionDivider: 'curve',
    density: 'comfortable', typeScale: 'balanced',
    headingAccent: 'dot', imageTreatment: 'blob',
  },
  brutalist: {
    borderRadius: 'none', cardStyle: 'flat', buttonStyle: 'solid',
    headingFont: 'montserrat', bodyFont: 'inter', animLevel: 'none',
    navbarStyle: 'solid', heroLayout: 'split', sectionDivider: 'none',
    density: 'compact', typeScale: 'dramatic',
    headingAccent: 'bar', imageTreatment: 'framed',
  },
  boutique: {
    borderRadius: 'full', cardStyle: 'glass', buttonStyle: 'outline',
    headingFont: 'raleway', bodyFont: 'poppins', animLevel: 'minimal',
    navbarStyle: 'transparent', heroLayout: 'centered', sectionDivider: 'curve',
    density: 'spacious', typeScale: 'balanced',
    headingAccent: 'dot', imageTreatment: 'circle',
  },
  bistro: {
    borderRadius: 'sm', cardStyle: 'bordered', buttonStyle: 'solid',
    headingFont: 'playfair', bodyFont: 'inter', animLevel: 'minimal',
    navbarStyle: 'solid', heroLayout: 'image-right', sectionDivider: 'none',
    density: 'comfortable', typeScale: 'balanced',
    headingAccent: 'rule', imageTreatment: 'arch',
  },
};

export class DesignConfig implements DesignTokens {
  constructor(
    public stylePreset: StylePreset | null,
    public borderRadius: BorderRadius,
    public cardStyle: CardStyle,
    public buttonStyle: ButtonStyle,
    public headingFont: FontFamily,
    public bodyFont: FontFamily,
    public animLevel: AnimLevel,
    public navbarStyle: NavbarStyle,
    public heroLayout: HeroLayout,
    public sectionDivider: SectionDivider,
    public density: Density,
    public typeScale: TypeScale,
    public headingAccent: HeadingAccent,
    public imageTreatment: ImageTreatment,
  ) {}

  // Resolution order for every token: explicit value → preset value → default.
  // This lets the backend store just `{ stylePreset: 'luxe' }` and have the
  // whole identity expand here, while still allowing per-field overrides.
  static fromJSON(json: any): DesignConfig {
    const preset: StylePreset | null =
      json?.stylePreset && json.stylePreset in STYLE_PRESETS ? json.stylePreset : null;
    const base = preset ? STYLE_PRESETS[preset] : DEFAULT_TOKENS;

    // Legacy single-font field falls back to both heading and body.
    const legacyFont: FontFamily | undefined = json?.fontFamily;

    return new DesignConfig(
      preset,
      json?.borderRadius ?? base.borderRadius,
      json?.cardStyle ?? base.cardStyle,
      json?.buttonStyle ?? base.buttonStyle,
      json?.headingFont ?? legacyFont ?? base.headingFont,
      json?.bodyFont ?? legacyFont ?? base.bodyFont,
      json?.animLevel ?? base.animLevel,
      json?.navbarStyle ?? base.navbarStyle,
      json?.heroLayout ?? base.heroLayout,
      json?.sectionDivider ?? base.sectionDivider,
      json?.density ?? base.density,
      json?.typeScale ?? base.typeScale,
      json?.headingAccent ?? base.headingAccent,
      json?.imageTreatment ?? base.imageTreatment,
    );
  }
}
