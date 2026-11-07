import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Pause, Play } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useEdit } from '../../services/editMode';
import { MetaDot, PostCover, PostLink, useBlogFormat, type BlogListProps } from './BlogParts';
import './blog.css';

/** The side pictures' distance from the centre, by the stack's width (circular-testimonials). */
export const gapFor = (width: number): number => {
  const minWidth = 1024;
  const maxWidth = 1456;
  if (width <= minWidth) return 60;
  if (width >= maxWidth) return Math.max(60, 86 + 0.06018 * (width - maxWidth));
  return 60 + 26 * ((width - minWidth) / (maxWidth - minWidth));
};

const EVERY_MS = 5000;

const prefersStill = (): boolean =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * LT-610 (Erel's designed blog carousel, from circular-testimonials): the
 * posts' pictures stacked in depth - the current one in front, the one before
 * and the one after raised and turned to either side - beside its title, date
 * and line, whose words arrive one by one. It moves on every five seconds, and
 * stands still under a pointer or focus, off screen, in a hidden tab, while
 * editing, with reduced motion, after the visitor picks a post, and with the
 * pause button (WCAG 2.2.2). Mirrored in Hebrew and Arabic.
 */
const BlogCarousel: React.FC<BlogListProps> = ({ posts, timeZone }) => {
  const { t, language } = useLanguage();
  const { editing } = useEdit();
  const f = useBlogFormat(timeZone);
  const rtl = language === 'he' || language === 'ar';
  const n = posts.length;
  const [active, setActive] = useState(0);
  const [width, setWidth] = useState(600);
  const [held, setHeld] = useState(false);
  const [stopped, setStopped] = useState(() => prefersStill());
  const [seen, setSeen] = useState(true);
  const stack = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = stack.current;
    if (!el) return;
    const measure = () => setWidth(el.offsetWidth || 600);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Sleeps off screen and in a hidden tab.
  useEffect(() => {
    const el = root.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setSeen(!!entry?.isIntersecting), { threshold: 0.2 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const [hidden, setHidden] = useState(() => typeof document !== 'undefined' && document.hidden);
  useEffect(() => {
    const onChange = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);

  const moving = !stopped && !held && seen && !hidden && !editing && n > 1;
  useEffect(() => {
    if (!moving) return;
    const timer = window.setInterval(() => setActive((i) => (i + 1) % n), EVERY_MS);
    return () => window.clearInterval(timer);
  }, [moving, n]);

  const step = useCallback((by: 1 | -1) => {
    setStopped(true);
    setActive((i) => (i + by + n) % n);
  }, [n]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const forward = rtl ? e.key === 'ArrowLeft' : e.key === 'ArrowRight';
    step(forward ? 1 : -1);
  };

  const gap = gapFor(width);
  const rise = gap * 0.8;
  // The one before sits on the reading side the visitor came from.
  const side = rtl ? -1 : 1;
  const plate = (index: number): React.CSSProperties => {
    if (index === active) return { zIndex: 3, opacity: 1, transform: 'translateX(0px) translateY(0px) scale(1) rotateY(0deg)' };
    if (index === (active - 1 + n) % n) {
      return { zIndex: 2, opacity: 1, transform: `translateX(${-gap * side}px) translateY(${-rise}px) scale(0.85) rotateY(${15 * side}deg)` };
    }
    if (index === (active + 1) % n) {
      return { zIndex: 2, opacity: 1, transform: `translateX(${gap * side}px) translateY(${-rise}px) scale(0.85) rotateY(${-15 * side}deg)` };
    }
    return { zIndex: 1, opacity: 0, pointerEvents: 'none', transform: 'scale(0.8)' };
  };

  const current = posts[active] ?? posts[0];
  if (!current) return null;
  const Prev = rtl ? ArrowRight : ArrowLeft;
  const Next = rtl ? ArrowLeft : ArrowRight;
  const button = 'flex h-11 w-11 items-center justify-center rounded-full bg-light-text text-light-bg transition-colors hover:bg-primary hover:text-on-primary dark:bg-dark-text dark:text-dark-bg dark:hover:bg-primary-dark dark:hover:text-on-primary-dark';
  const words = (current.summary ?? '').split(/\s+/).filter(Boolean);

  return (
    <div
      ref={root}
      className="mx-auto grid max-w-4xl items-center gap-16 md:grid-cols-2 md:gap-20"
      role="region"
      aria-roledescription="carousel"
      aria-label={t('blog.latest')}
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHeld(false); }}
      onKeyDown={onKeyDown}
      data-testid="blog-carousel"
    >
      <div ref={stack} className="lt-blog-stack relative mt-12 h-72 w-full sm:h-96">
        {posts.map((post, i) => (
          <div key={post.id} className="lt-blog-plate" style={plate(i)} aria-hidden={i !== active} data-testid="carousel-plate">
            <PostLink post={post} tabIndex={i === active ? 0 : -1} className="block h-full w-full" label={post.title}>
              <PostCover post={post} eager={i < 3} className="h-full w-full rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.2)]" />
            </PostLink>
          </div>
        ))}
      </div>
      <div className="flex flex-col justify-between">
        <div key={current.id} aria-live={stopped ? 'polite' : 'off'}>
          <h3 className="lt-blog-title mb-1 font-bold text-light-text break-words [--lt-size:1.5rem] [--lt-lh:1.25] md:[--lt-size:1.75rem] dark:text-dark-text">
            <PostLink post={current} className="hover:text-primary-readable dark:hover:text-primary-dark-readable">{current.title}</PostLink>
          </h3>
          <p className="mb-8 flex flex-wrap items-center gap-2 text-[0.95rem] text-light-text/65 dark:text-dark-text/65">
            {current.category && <><span>{current.category}</span><MetaDot /></>}
            <time dateTime={current.publishedAt}>{f.date(current.publishedAt)}</time>
          </p>
          {words.length > 0 && (
            <p className="text-lg leading-[1.75] text-light-text/85 break-words dark:text-dark-text/85">
              {words.map((word, i) => (
                <React.Fragment key={i}>
                  <span className="lt-blog-word" style={{ '--i': i } as React.CSSProperties}>{word}</span>{' '}
                </React.Fragment>
              ))}
            </p>
          )}
        </div>
        <div className="flex items-center gap-6 pt-12 md:pt-8">
          <button type="button" className={button} onClick={() => step(-1)} aria-label={t('blog.prev')}>
            <Prev className="h-6 w-6" aria-hidden="true" />
          </button>
          <button type="button" className={button} onClick={() => step(1)} aria-label={t('blog.next')}>
            <Next className="h-6 w-6" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setStopped((s) => !s)}
            aria-label={stopped ? t('blog.play') : t('blog.pause')}
            aria-pressed={!stopped}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-light-text/20 text-light-text/75 transition-colors hover:border-primary dark:border-dark-text/20 dark:text-dark-text/75 dark:hover:border-primary-dark"
          >
            {stopped ? <Play className="h-4 w-4" aria-hidden="true" /> : <Pause className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BlogCarousel;
