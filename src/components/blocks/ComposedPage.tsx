import { Fragment, cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import type { WebsiteConfig } from '../../models/WebsiteConfig';
import type { Block } from '../../models/Block';
import type { SiteJitter } from '../../services/seed';
import { SPACING_CLASS } from '../../services/artDirection';
import ImagesService from '../../services/ImagesService';
import ErrorBoundary from '../ErrorBoundary';
import GenerateReveal from '../GenerateReveal';
import SectionDivider, { type SectionTone } from '../SectionDivider';
import Hero from '../Layout/Hero';
import About from '../Layout/About';
import Portfolio from '../Portfolio';
import Testimonials from '../Layout/Testimonials';
import Faq from '../Layout/Faq';
import ServicesLedger from '../Layout/ServicesLedger';
import Interlude from '../Layout/Interlude';
import BookingBand from '../Layout/BookingBand';
import Schedule from '../Layout/Schedule/Schedule';
import Contact from '../Layout/Contact';
import Footer from '../Layout/Footer';
import TickerBlock from './TickerBlock';
import Announcement from './Announcement';
import Manifesto from './Manifesto';
import Stats, { type StatItem } from './Stats';
import PullQuote from './PullQuote';
import Process, { type ProcessStep } from './Process';
import PriceCards from './PriceCards';
import Hours from './Hours';
import PhotoPair from './PhotoPair';
import BeforeAfter from './BeforeAfter';
import MapStrip from './MapStrip';
import LogoMark from './LogoMark';
import SocialTiles from './SocialTiles';
import type { AboutLayout, PortfolioLayout, TestimonialsLayout, FaqStyle, ContactLayout, FooterLayout, HeroLayout } from '../../models/DesignConfig';

interface ComposedPageProps {
  config: WebsiteConfig;
  jitter: SiteJitter;
  isPreview: boolean;
  /** Generation count from the preview bridge; >0 plays the section cascade. */
  generateSeq?: number;
}

/** Block types this renderer can draw today; the rest arrive in phase 3. */
export const SUPPORTED_BLOCKS = new Set<Block['type']>([
  'hero', 'intro', 'features', 'visit', 'gallery', 'quote', 'faq', 'ledger',
  'interlude', 'bookingBand', 'schedule', 'contact', 'footer',
  // LT-136 (phase 3)
  'ticker', 'announcement', 'manifesto', 'stats', 'pullQuote', 'process',
  'priceCards', 'hours', 'photoPair', 'beforeAfter', 'mapStrip', 'logoMark', 'social',
]);

const INTRO_LAYOUT: Record<string, AboutLayout> = { plain: 'cards', manifesto: 'manifesto', columns: 'wall' };
const FEATURES_LAYOUT: Record<string, AboutLayout> = { tiles: 'cards', band: 'band', wall: 'wall', timeline: 'timeline', sticky: 'sticky' };

/**
 * LT-133 (Composer phase 1): renders a stored `blocks` array through the
 * existing section components. Each block's `mod` carries what the legacy
 * flow draws at render time (tone, spacing, heading scale, inversion,
 * backdrop), so a composition is fully described by the stored config.
 */
const ComposedPage: React.FC<ComposedPageProps> = ({ config, jitter, isPreview, generateSeq = 0 }) => {
  const c = config.components;
  const design = config.design;
  const hasBand = config.blocks.some((b) => b.type === 'bookingBand');

  const render = (b: Block): ReactNode => {
    const v = b.variant;
    const p = b.props ?? {};
    switch (b.type) {
      case 'hero':
        return c?.hero ? (
          <Hero
            config={c.hero}
            social={config.social}
            phone={config.contact.phone}
            isContactVisible={config.blocks.some((x) => x.type === 'contact')}
            appointmentTypes={config.appointmentTypes}
            isPreview={isPreview}
            palette={config.pallete}
            design={v ? { ...design, heroLayout: v as HeroLayout } : design}
            jitter={{ posterAlt: jitter.posterAlt, flipPosterSplit: jitter.flipPosterSplit, decorStart: jitter.decorStart }}
          />
        ) : null;
      case 'intro':
      case 'features':
      case 'visit': {
        if (!c?.about) return null;
        const layout = b.type === 'intro' ? (INTRO_LAYOUT[v ?? 'plain'] ?? 'cards')
          : b.type === 'features' ? (FEATURES_LAYOUT[v ?? 'tiles'] ?? 'cards') : 'cards';
        return (
          <About
            config={c.about}
            websiteConfig={{ address: config.address, contact: config.contact, social: config.social, workingDays: config.workingDays }}
            layout={layout}
            featureStyle={design?.featureStyle}
            flipSplit={jitter.flipAboutSplit}
            parts={[b.type]}
            sectionId={b.type === 'intro' ? 'about' : `about-${b.type}`}
          />
        );
      }
      case 'gallery':
        // LT-137: layouts only apply in grid mode; the model's carousel flag
        // used to hide every one of them on generated sites.
        return c?.portfolio ? <Portfolio config={{ ...c.portfolio, isGrid: true }} layout={(v as PortfolioLayout) ?? design?.portfolioLayout} masonryPhase={jitter.masonryPhase} /> : null;
      case 'quote':
        return c?.testimonials && (c.testimonials.items?.length ?? 0) > 0
          ? <Testimonials config={c.testimonials} tone="bg" layout={(v as TestimonialsLayout) ?? design?.testimonialsLayout} />
          : null;
      case 'faq':
        return c?.faq && (c.faq.items?.length ?? 0) > 0
          ? <Faq config={c.faq} tone="bg" faqStyle={(v as FaqStyle) ?? design?.faqStyle} />
          : null;
      case 'ledger':
        return (config.appointmentTypes ?? []).some((a) => a?.name)
          ? <ServicesLedger appointmentTypes={config.appointmentTypes} tone="bg" />
          : null;
      case 'interlude': {
        const image = (typeof p.image === 'string' && p.image) || c?.portfolio?.items?.[1]?.url || c?.hero?.heroImageSrc;
        if (!image) return null;
        const statement = (typeof p.text === 'string' && p.text) || c?.about?.paragraphs?.mission?.trim() || undefined;
        return <Interlude image={image} statement={statement} variant={v === 'split' ? 1 : 0} />;
      }
      case 'bookingBand': {
        const statement = (typeof p.text === 'string' && p.text) || c?.schedule?.description?.trim();
        const chips = v === 'chips' ? (config.appointmentTypes ?? []).map((a) => a?.name).filter((n): n is string => !!n) : undefined;
        return statement ? <BookingBand statement={statement} chips={chips} /> : null;
      }
      // LT-136 — the fourteen phase-3 blocks.
      case 'ticker':
        return <TickerBlock items={(config.appointmentTypes ?? []).map((a) => a?.name).filter((n): n is string => !!n)} />;
      case 'announcement':
        return typeof p.text === 'string' && p.text.trim() ? <Announcement text={p.text.trim()} /> : null;
      case 'manifesto':
        return typeof p.text === 'string' && p.text.trim() ? <Manifesto text={p.text.trim()} /> : null;
      case 'stats':
        return Array.isArray(p.items) ? <Stats items={p.items as StatItem[]} /> : null;
      case 'pullQuote':
        return typeof p.text === 'string' && p.text.trim()
          ? <PullQuote text={p.text.trim()} attribution={typeof p.attribution === 'string' ? p.attribution : config.businessName} />
          : null;
      case 'process':
        return Array.isArray(p.steps) ? <Process steps={p.steps as ProcessStep[]} title={typeof p.title === 'string' ? p.title : undefined} variant={v} /> : null;
      case 'priceCards':
        return <PriceCards appointmentTypes={config.appointmentTypes ?? []} />;
      case 'hours':
        return <Hours workingDays={config.workingDays ?? []} variant={v} />;
      case 'photoPair': {
        const from = typeof p.from === 'number' ? p.from : 0;
        return <PhotoPair items={(c?.portfolio?.items ?? []).slice(from, from + 2)} variant={v} />;
      }
      case 'beforeAfter':
        return <BeforeAfter items={(c?.portfolio?.items ?? []).slice(0, 2)} />;
      case 'mapStrip':
        return config.address ? <MapStrip address={config.address} /> : null;
      case 'logoMark':
        return config.logoImageName ? <LogoMark logo={config.logoImageName} businessName={config.businessName} /> : null;
      case 'social':
        return config.social ? <SocialTiles social={config.social} /> : null;
      case 'schedule':
        return c?.schedule ? (
          <div id="booking-section" className="relative min-h-[25rem]">
            <Schedule
              hideDescription={hasBand && !!c.schedule.description?.trim()}
              config={c.schedule}
              workingDays={config.workingDays}
              user_id={config.user_id}
              phone={config.contact.phone}
              businessName={config.businessName}
              timeToCancel={config.minCancelTimeMS}
              bookingHorizonDays={config.bookingHorizonDays}
              vacations={config.vacations}
              dateOverrides={config.dateOverrides}
              appointmentTypes={config.appointmentTypes}
              isPreview={isPreview}
              header={design?.sectionHeader}
              scheduleStyle={(v as 'card' | 'flat' | 'inset' | 'split') ?? design?.scheduleStyle}
              headerScale={b.mod?.scale}
            />
          </div>
        ) : null;
      case 'contact':
        return c?.contact ? (
          <Contact
            config={c.contact}
            address={config.address}
            contact={config.contact}
            workingDays={config.workingDays}
            layout={(v as ContactLayout) ?? design?.contactLayout}
          />
        ) : null;
      case 'footer':
        return c?.footer ? (
          <Footer
            config={c.footer}
            appointmentsType={config.appointmentTypes}
            social={config.social}
            businessName={config.businessName}
            logoImageName={config.logoImageName}
            websiteConfig={c}
            layout={(v as FooterLayout) ?? design?.footerLayout}
            city={config.address?.city}
          />
        ) : null;
      default:
        return null; // phase 3 blocks
    }
  };

  // Tones alternate bg/surface unless the block pins one.
  const items: { block: Block; tone: SectionTone; node: ReactNode }[] = [];
  let last: SectionTone = 'surface';
  for (const block of config.blocks) {
    const node = render(block);
    if (node === null) continue;
    const tone: SectionTone = block.mod?.tone ?? (last === 'bg' ? 'surface' : 'bg');
    items.push({ block, tone, node });
    last = tone;
  }

  const divider = design?.sectionDivider ?? 'none';
  const flat = (b: Block) => ['bookingBand', 'interlude', 'footer', 'hero', 'ticker', 'announcement', 'logoMark', 'mapStrip'].includes(b.type)
    || (b.mod?.backdrop && b.mod.backdrop !== 'none') || !!b.mod?.invert;
  const heroImg = c?.hero?.heroImageSrc;

  return (
    <>
      {items.map((it, i) => {
        const { block: b, tone, node } = it;
        const inner = (
          <GenerateReveal seq={generateSeq} index={i}>
            <ErrorBoundary>
              {isValidElement(node) && typeof (node as ReactElement).type !== 'string'
                ? cloneElement(node as ReactElement, { header: design?.sectionHeader, tone, reveal: design?.revealStyle, headerScale: b.mod?.scale } as Record<string, unknown>)
                : node}
            </ErrorBoundary>
          </GenerateReveal>
        );
        const backdrop = b.mod?.backdrop ?? 'none';
        const extra = [SPACING_CLASS[b.mod?.spacing ?? 'normal'], b.mod?.invert ? 'dark' : ''].filter(Boolean).join(' ');
        const wrapped = backdrop !== 'none' ? (
          <div className={`relative isolate bg-light-bg dark:bg-dark-bg [&>section]:!bg-transparent ${extra}`}>
            {backdrop === 'photo' && heroImg && (
              <img src={ImagesService.getInstance().getImage(heroImg)} alt="" aria-hidden="true" className="absolute inset-0 -z-10 w-full h-full object-cover opacity-[0.08] dark:opacity-[0.12]" />
            )}
            {backdrop === 'tinted' && <div className="absolute inset-0 -z-10 bg-primary/[0.06] dark:bg-primary-dark/[0.09]" aria-hidden="true" />}
            {backdrop === 'pattern' && <div className="absolute inset-0 -z-10 lt-pattern" aria-hidden="true" />}
            {inner}
          </div>
        ) : extra ? <div className={extra}>{inner}</div> : inner;
        return (
          <Fragment key={b.id}>
            {i > 0 && !flat(b) && !flat(items[i - 1].block) && (
              <SectionDivider variant={divider} aboveTone={items[i - 1].tone} belowTone={tone} mirror={jitter.mirrorDividers} />
            )}
            {wrapped}
          </Fragment>
        );
      })}
    </>
  );
};

export default ComposedPage;
