export type BorderRadius = 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
export type CardStyle = 'flat' | 'elevated' | 'glass' | 'bordered';
export type ButtonStyle = 'solid' | 'gradient' | 'outline' | 'ghost';
export type FontFamily =
  | 'inter' | 'raleway' | 'playfair' | 'montserrat' | 'poppins'
  // LT-093 vibe families. Each has a Hebrew-capable RTL counterpart in
  // useTheme; bellefair/secularone/varela cover Hebrew natively.
  | 'anton' | 'archivo' | 'cormorant' | 'bellefair' | 'secularone'
  | 'varela' | 'sora' | 'spacemono';
export type AnimLevel = 'none' | 'minimal' | 'full';
export type NavbarStyle = 'floating' | 'solid' | 'transparent';
// 'text-first' (LT-093): centered copy block with a large image below it —
// the editorial-stack composition from the vibe mockups.
// 'poster-split' (LT-109): the Barber-artboard hero — poster headline column
// beside a tall image block; the vibe-template composition, not a variant.
// 'poster-statement' (LT-113): the Ink-artboard hero — text-only stacked
// poster with an outline-stroke second line, no image. 'fullbleed' (LT-113):
// the Lens-artboard hero — edge-to-edge image with the title overlaid.
export type HeroLayout = 'image-right' | 'centered' | 'split' | 'text-first' | 'poster-split' | 'poster-statement' | 'fullbleed';
export type SectionDivider = 'none' | 'wave' | 'diagonal' | 'curve' | 'scallop' | 'zigzag';
export type Density = 'compact' | 'comfortable' | 'spacious';
// 'poster' (LT-108): the vibe-canvas hero manner — enormous condensed
// display type; only sane with condensed heading faces (anton).
export type TypeScale = 'modest' | 'balanced' | 'dramatic' | 'poster';
export type HeadingAccent = 'bar' | 'rule' | 'dot' | 'none';
// 'framed' was retired in LT-080/081 (its offset border read as a stray
// line); stored configs may still carry the string — fromJSON passes it
// through untyped and Hero renders it as 'rounded'.
export type ImageTreatment = 'rounded' | 'circle' | 'arch' | 'blob';
// Per-section skeletons (LT-051). The first value of each is the pre-LT-051
// layout, and DEFAULT_TOKENS picks it, so unpresetted sites don't move.
// 'manifesto' (LT-109): big display pull-quote beside the paragraphs — the
// artboard's statement composition.
export type AboutLayout = 'cards' | 'split' | 'band' | 'manifesto';
export type PortfolioLayout = 'grid' | 'masonry' | 'filmstrip' | 'polaroid' | 'flash';
export type ContactLayout = 'split' | 'stacked';
export type FooterLayout = 'columns' | 'minimal';
// LT-093 axes. First value = the pre-LT-093 rendering, picked by
// DEFAULT_TOKENS and by every pre-existing preset, so live sites don't move.
export type TestimonialsLayout = 'cards' | 'quote' | 'bubbles';
export type FaqStyle = 'cards' | 'lines' | 'numbered' | 'pills';
// A site's out-of-the-box theme. The visitor's own choice (localStorage)
// always wins; this only decides what a first-time visitor sees.
export type DefaultTheme = 'light' | 'dark';
// LT-107 vibe signatures (from the LT-092 canvas): a hero decoration —
// repeating text strips (ticker/marquee), a rotated stamp badge, confetti
// dots, or a line-drawn sun. 'none' = pre-LT-107 rendering.
export type Decor = 'none' | 'ticker' | 'marquee' | 'stamp' | 'confetti' | 'sun' | 'monogram';
// How About features are marked: icon tiles (legacy), big two-digit numbers
// (industrial ledger feel), or roman numerals (heritage).
export type FeatureStyle = 'icons' | 'numbered' | 'roman';
// LT-109: the numbered dotted-leader price ledger built from the business's
// real services (the canvas 'המחירון' section). 'none' = section absent.
export type ServicesLayout = 'none' | 'ledger';

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
  | 'bistro'
  // LT-093 vibe presets — one per direction from the LT-092 canvas.
  | 'industrial'
  | 'atelier'
  | 'serene'
  | 'electric'
  | 'underground'
  | 'festive'
  | 'crisp'
  | 'gallery'
  | 'heritage'
  | 'earthy';

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
  aboutLayout: AboutLayout;
  portfolioLayout: PortfolioLayout;
  contactLayout: ContactLayout;
  footerLayout: FooterLayout;
  testimonialsLayout: TestimonialsLayout;
  faqStyle: FaqStyle;
  defaultTheme: DefaultTheme;
  decor: Decor;
  featureStyle: FeatureStyle;
  servicesLayout: ServicesLayout;
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
  aboutLayout: 'cards',
  portfolioLayout: 'grid',
  contactLayout: 'split',
  footerLayout: 'columns',
  testimonialsLayout: 'cards',
  faqStyle: 'cards',
  defaultTheme: 'light',
  decor: 'none',
  featureStyle: 'icons',
  servicesLayout: 'none',
};

// Opinionated, deliberately divergent bundles. Picking one of these gives a
// coherent identity AND guarantees two sites look genuinely different — the
// presets are engineered to differ across every axis, not just color.
// The original ten keep their exact pre-LT-093 values (the three new axes
// hold the old behavior); the ten vibe presets below them are additive.
export const STYLE_PRESETS: Record<StylePreset, DesignTokens> = {
  luxe: {
    borderRadius: 'none', cardStyle: 'bordered', buttonStyle: 'outline',
    headingFont: 'playfair', bodyFont: 'raleway', animLevel: 'minimal',
    navbarStyle: 'transparent', heroLayout: 'centered', sectionDivider: 'curve',
    density: 'spacious', typeScale: 'dramatic',
    headingAccent: 'rule', imageTreatment: 'arch',
    aboutLayout: 'band', portfolioLayout: 'masonry', contactLayout: 'stacked', footerLayout: 'minimal',
    testimonialsLayout: 'cards', faqStyle: 'cards', defaultTheme: 'light',
    decor: 'none', featureStyle: 'icons', servicesLayout: 'none',
  },
  editorial: {
    borderRadius: 'none', cardStyle: 'flat', buttonStyle: 'ghost',
    headingFont: 'playfair', bodyFont: 'inter', animLevel: 'minimal',
    navbarStyle: 'solid', heroLayout: 'split', sectionDivider: 'none',
    density: 'spacious', typeScale: 'dramatic',
    headingAccent: 'rule', imageTreatment: 'rounded',
    aboutLayout: 'split', portfolioLayout: 'masonry', contactLayout: 'split', footerLayout: 'minimal',
    testimonialsLayout: 'cards', faqStyle: 'cards', defaultTheme: 'light',
    decor: 'none', featureStyle: 'icons', servicesLayout: 'none',
  },
  boldStartup: {
    borderRadius: 'lg', cardStyle: 'glass', buttonStyle: 'gradient',
    headingFont: 'montserrat', bodyFont: 'inter', animLevel: 'full',
    navbarStyle: 'floating', heroLayout: 'split', sectionDivider: 'diagonal',
    density: 'comfortable', typeScale: 'balanced',
    headingAccent: 'bar', imageTreatment: 'rounded',
    aboutLayout: 'cards', portfolioLayout: 'grid', contactLayout: 'split', footerLayout: 'columns',
    testimonialsLayout: 'cards', faqStyle: 'cards', defaultTheme: 'light',
    decor: 'none', featureStyle: 'icons', servicesLayout: 'none',
  },
  corporate: {
    borderRadius: 'sm', cardStyle: 'bordered', buttonStyle: 'solid',
    headingFont: 'inter', bodyFont: 'inter', animLevel: 'minimal',
    navbarStyle: 'solid', heroLayout: 'image-right', sectionDivider: 'none',
    density: 'compact', typeScale: 'modest',
    headingAccent: 'bar', imageTreatment: 'rounded',
    aboutLayout: 'split', portfolioLayout: 'grid', contactLayout: 'split', footerLayout: 'columns',
    testimonialsLayout: 'cards', faqStyle: 'cards', defaultTheme: 'light',
    decor: 'none', featureStyle: 'icons', servicesLayout: 'none',
  },
  playful: {
    borderRadius: 'full', cardStyle: 'elevated', buttonStyle: 'gradient',
    headingFont: 'poppins', bodyFont: 'poppins', animLevel: 'full',
    navbarStyle: 'floating', heroLayout: 'centered', sectionDivider: 'wave',
    density: 'comfortable', typeScale: 'balanced',
    headingAccent: 'dot', imageTreatment: 'blob',
    aboutLayout: 'cards', portfolioLayout: 'grid', contactLayout: 'stacked', footerLayout: 'columns',
    testimonialsLayout: 'cards', faqStyle: 'cards', defaultTheme: 'light',
    decor: 'none', featureStyle: 'icons', servicesLayout: 'none',
  },
  minimal: {
    borderRadius: 'none', cardStyle: 'flat', buttonStyle: 'outline',
    headingFont: 'inter', bodyFont: 'inter', animLevel: 'none',
    navbarStyle: 'transparent', heroLayout: 'image-right', sectionDivider: 'none',
    density: 'spacious', typeScale: 'balanced',
    headingAccent: 'none', imageTreatment: 'rounded',
    aboutLayout: 'band', portfolioLayout: 'masonry', contactLayout: 'stacked', footerLayout: 'minimal',
    testimonialsLayout: 'cards', faqStyle: 'cards', defaultTheme: 'light',
    decor: 'none', featureStyle: 'icons', servicesLayout: 'none',
  },
  warmOrganic: {
    borderRadius: 'xl', cardStyle: 'elevated', buttonStyle: 'solid',
    headingFont: 'raleway', bodyFont: 'poppins', animLevel: 'minimal',
    navbarStyle: 'floating', heroLayout: 'image-right', sectionDivider: 'curve',
    density: 'comfortable', typeScale: 'balanced',
    headingAccent: 'dot', imageTreatment: 'blob',
    aboutLayout: 'cards', portfolioLayout: 'grid', contactLayout: 'split', footerLayout: 'columns',
    testimonialsLayout: 'cards', faqStyle: 'cards', defaultTheme: 'light',
    decor: 'none', featureStyle: 'icons', servicesLayout: 'none',
  },
  brutalist: {
    borderRadius: 'none', cardStyle: 'flat', buttonStyle: 'solid',
    headingFont: 'montserrat', bodyFont: 'inter', animLevel: 'none',
    navbarStyle: 'solid', heroLayout: 'split', sectionDivider: 'none',
    density: 'compact', typeScale: 'dramatic',
    headingAccent: 'bar', imageTreatment: 'rounded',
    aboutLayout: 'band', portfolioLayout: 'filmstrip', contactLayout: 'split', footerLayout: 'minimal',
    testimonialsLayout: 'cards', faqStyle: 'cards', defaultTheme: 'light',
    decor: 'none', featureStyle: 'icons', servicesLayout: 'none',
  },
  boutique: {
    borderRadius: 'full', cardStyle: 'glass', buttonStyle: 'outline',
    headingFont: 'raleway', bodyFont: 'poppins', animLevel: 'minimal',
    navbarStyle: 'transparent', heroLayout: 'centered', sectionDivider: 'curve',
    density: 'spacious', typeScale: 'balanced',
    headingAccent: 'dot', imageTreatment: 'circle',
    aboutLayout: 'split', portfolioLayout: 'filmstrip', contactLayout: 'stacked', footerLayout: 'minimal',
    testimonialsLayout: 'cards', faqStyle: 'cards', defaultTheme: 'light',
    decor: 'none', featureStyle: 'icons', servicesLayout: 'none',
  },
  bistro: {
    borderRadius: 'sm', cardStyle: 'bordered', buttonStyle: 'solid',
    headingFont: 'playfair', bodyFont: 'inter', animLevel: 'minimal',
    navbarStyle: 'solid', heroLayout: 'image-right', sectionDivider: 'none',
    density: 'comfortable', typeScale: 'balanced',
    headingAccent: 'rule', imageTreatment: 'arch',
    aboutLayout: 'split', portfolioLayout: 'grid', contactLayout: 'stacked', footerLayout: 'columns',
    testimonialsLayout: 'cards', faqStyle: 'cards', defaultTheme: 'light',
    decor: 'none', featureStyle: 'icons', servicesLayout: 'none',
  },

  // ── LT-093 vibe presets (from the LT-092 direction canvas) ──────────────

  // Barbershop / dark industrial: condensed display type, ledger rhythm.
  industrial: {
    borderRadius: 'none', cardStyle: 'flat', buttonStyle: 'solid',
    headingFont: 'anton', bodyFont: 'inter', animLevel: 'minimal',
    navbarStyle: 'solid', heroLayout: 'poster-split', sectionDivider: 'none',
    density: 'compact', typeScale: 'poster',
    headingAccent: 'bar', imageTreatment: 'rounded',
    aboutLayout: 'manifesto', portfolioLayout: 'filmstrip', contactLayout: 'split', footerLayout: 'minimal',
    testimonialsLayout: 'quote', faqStyle: 'numbered', defaultTheme: 'dark',
    decor: 'ticker', featureStyle: 'numbered', servicesLayout: 'ledger',
  },
  // Beauty boutique / luxe editorial: centered serif over an arch image.
  atelier: {
    borderRadius: 'none', cardStyle: 'bordered', buttonStyle: 'outline',
    headingFont: 'playfair', bodyFont: 'raleway', animLevel: 'minimal',
    navbarStyle: 'transparent', heroLayout: 'text-first', sectionDivider: 'none',
    density: 'spacious', typeScale: 'dramatic',
    headingAccent: 'rule', imageTreatment: 'arch',
    aboutLayout: 'split', portfolioLayout: 'masonry', contactLayout: 'split', footerLayout: 'minimal',
    testimonialsLayout: 'quote', faqStyle: 'lines', defaultTheme: 'light',
    decor: 'none', featureStyle: 'icons', servicesLayout: 'none',
  },
  // Therapist / calm organic: soft shapes, generous air.
  serene: {
    borderRadius: 'xl', cardStyle: 'elevated', buttonStyle: 'solid',
    headingFont: 'cormorant', bodyFont: 'raleway', animLevel: 'minimal',
    navbarStyle: 'floating', heroLayout: 'image-right', sectionDivider: 'curve',
    density: 'spacious', typeScale: 'balanced',
    headingAccent: 'dot', imageTreatment: 'blob',
    aboutLayout: 'band', portfolioLayout: 'grid', contactLayout: 'stacked', footerLayout: 'minimal',
    testimonialsLayout: 'cards', faqStyle: 'cards', defaultTheme: 'light',
    decor: 'none', featureStyle: 'icons', servicesLayout: 'none',
  },
  // Fitness / volt energy: heavy grotesk, hard edges, dark ground.
  electric: {
    borderRadius: 'sm', cardStyle: 'bordered', buttonStyle: 'solid',
    headingFont: 'archivo', bodyFont: 'inter', animLevel: 'full',
    navbarStyle: 'solid', heroLayout: 'poster-split', sectionDivider: 'diagonal',
    density: 'compact', typeScale: 'poster',
    headingAccent: 'bar', imageTreatment: 'rounded',
    aboutLayout: 'cards', portfolioLayout: 'grid', contactLayout: 'split', footerLayout: 'minimal',
    testimonialsLayout: 'cards', faqStyle: 'lines', defaultTheme: 'dark',
    decor: 'marquee', featureStyle: 'numbered', servicesLayout: 'none',
  },
  // Tattoo / punk mono: condensed caps with monospace body.
  underground: {
    borderRadius: 'none', cardStyle: 'bordered', buttonStyle: 'solid',
    headingFont: 'anton', bodyFont: 'spacemono', animLevel: 'none',
    navbarStyle: 'solid', heroLayout: 'poster-statement', sectionDivider: 'zigzag',
    density: 'compact', typeScale: 'poster',
    headingAccent: 'none', imageTreatment: 'rounded',
    aboutLayout: 'manifesto', portfolioLayout: 'flash', contactLayout: 'split', footerLayout: 'minimal',
    testimonialsLayout: 'cards', faqStyle: 'lines', defaultTheme: 'dark',
    decor: 'stamp', featureStyle: 'numbered', servicesLayout: 'none',
  },
  // Kids / playful: round everything, scalloped edges, speech bubbles.
  festive: {
    borderRadius: 'full', cardStyle: 'elevated', buttonStyle: 'solid',
    headingFont: 'secularone', bodyFont: 'varela', animLevel: 'full',
    navbarStyle: 'floating', heroLayout: 'centered', sectionDivider: 'scallop',
    density: 'comfortable', typeScale: 'balanced',
    headingAccent: 'dot', imageTreatment: 'circle',
    aboutLayout: 'cards', portfolioLayout: 'polaroid', contactLayout: 'stacked', footerLayout: 'columns',
    testimonialsLayout: 'bubbles', faqStyle: 'pills', defaultTheme: 'light',
    decor: 'confetti', featureStyle: 'icons', servicesLayout: 'none',
  },
  // Clinic / clean trust: structured grid, modest type, tidy cards.
  crisp: {
    borderRadius: 'md', cardStyle: 'bordered', buttonStyle: 'solid',
    headingFont: 'sora', bodyFont: 'inter', animLevel: 'minimal',
    navbarStyle: 'solid', heroLayout: 'image-right', sectionDivider: 'none',
    density: 'comfortable', typeScale: 'modest',
    headingAccent: 'bar', imageTreatment: 'rounded',
    aboutLayout: 'cards', portfolioLayout: 'grid', contactLayout: 'split', footerLayout: 'columns',
    testimonialsLayout: 'cards', faqStyle: 'cards', defaultTheme: 'light',
    decor: 'none', featureStyle: 'icons', servicesLayout: 'none',
  },
  // Photographer / image-first: near-invisible chrome, work up front.
  gallery: {
    borderRadius: 'none', cardStyle: 'flat', buttonStyle: 'ghost',
    headingFont: 'archivo', bodyFont: 'archivo', animLevel: 'none',
    navbarStyle: 'transparent', heroLayout: 'fullbleed', sectionDivider: 'none',
    density: 'spacious', typeScale: 'dramatic',
    headingAccent: 'none', imageTreatment: 'rounded',
    aboutLayout: 'band', portfolioLayout: 'masonry', contactLayout: 'stacked', footerLayout: 'minimal',
    testimonialsLayout: 'quote', faqStyle: 'lines', defaultTheme: 'light',
    decor: 'none', featureStyle: 'icons', servicesLayout: 'none',
  },
  // Law / classical: serif authority, ruled lines, no ornament.
  heritage: {
    borderRadius: 'none', cardStyle: 'bordered', buttonStyle: 'solid',
    headingFont: 'cormorant', bodyFont: 'inter', animLevel: 'minimal',
    navbarStyle: 'solid', heroLayout: 'centered', sectionDivider: 'none',
    density: 'comfortable', typeScale: 'balanced',
    headingAccent: 'rule', imageTreatment: 'rounded',
    aboutLayout: 'split', portfolioLayout: 'grid', contactLayout: 'split', footerLayout: 'columns',
    testimonialsLayout: 'quote', faqStyle: 'numbered', defaultTheme: 'light',
    decor: 'monogram', featureStyle: 'roman', servicesLayout: 'ledger',
  },
  // Yoga / boho earthy: arches, waves, warm serif.
  earthy: {
    borderRadius: 'xl', cardStyle: 'elevated', buttonStyle: 'solid',
    headingFont: 'bellefair', bodyFont: 'raleway', animLevel: 'minimal',
    navbarStyle: 'floating', heroLayout: 'text-first', sectionDivider: 'wave',
    density: 'comfortable', typeScale: 'balanced',
    headingAccent: 'dot', imageTreatment: 'arch',
    aboutLayout: 'split', portfolioLayout: 'grid', contactLayout: 'stacked', footerLayout: 'minimal',
    testimonialsLayout: 'quote', faqStyle: 'lines', defaultTheme: 'light',
    decor: 'sun', featureStyle: 'icons', servicesLayout: 'none',
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
    public aboutLayout: AboutLayout,
    public portfolioLayout: PortfolioLayout,
    public contactLayout: ContactLayout,
    public footerLayout: FooterLayout,
    public testimonialsLayout: TestimonialsLayout,
    public faqStyle: FaqStyle,
    public defaultTheme: DefaultTheme,
    public decor: Decor,
    public featureStyle: FeatureStyle,
    public servicesLayout: ServicesLayout,
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
      json?.aboutLayout ?? base.aboutLayout,
      json?.portfolioLayout ?? base.portfolioLayout,
      json?.contactLayout ?? base.contactLayout,
      json?.footerLayout ?? base.footerLayout,
      json?.testimonialsLayout ?? base.testimonialsLayout,
      json?.faqStyle ?? base.faqStyle,
      json?.defaultTheme ?? base.defaultTheme,
      json?.decor ?? base.decor,
      json?.featureStyle ?? base.featureStyle,
      json?.servicesLayout ?? base.servicesLayout,
    );
  }
}
