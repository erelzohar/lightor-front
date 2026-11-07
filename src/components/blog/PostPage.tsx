import React, { useEffect, useState } from 'react';
import { Check, MessageCircle, Share2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { followLink, useSiteNav } from '../../services/siteNav';
import { readInlinePage } from '../../services/edgeShell';
import WebConfigService from '../../services/WebConfigService';
import { postCardOf, rememberPosts } from '../../services/postCards';
import ImagesService from '../../services/ImagesService';
import { BLOG_PATH, parsePost, parsePostCard, type Post, type PostBlock, type PostCard } from '../../models/Post';
import type { PostLayout } from '../../models/DesignConfig';
import Loading from '../Loading';
import NotFound from '../NotFound';
import { BusinessMark, MetaDot, PostCover, PostTile, useBlogFormat } from './BlogParts';
import './blog.css';

interface Props {
  slug: string;
  businessName: string;
  logo?: string;
  timeZone?: string;
  layout?: PostLayout;
  blogTitle?: string;
  /** The site's main button (its own words or the mode's), to end the post with. */
  cta?: { href: string; label: string } | null;
  /** The dashboard's draft, in its preview: drawn as it is, nothing fetched. */
  draft?: Post;
}

interface Loaded { post: Post; more: PostCard[]; partial?: boolean }

const DAY_MS = 86_400_000;

/** The post's blocks as text: headings, paragraphs, lists, a quote, pictures with their captions. */
export const PostBody: React.FC<{ blocks: PostBlock[] }> = ({ blocks }) => (
  <div className="text-lg leading-relaxed text-light-text dark:text-dark-text" data-testid="post-body">
    {blocks.map((b, i) => {
      switch (b.kind) {
        case 'h2': return <h2 key={i} className="lt-blog-title mb-4 mt-10 font-bold break-words [--lt-size:1.5rem] [--lt-lh:1.25] md:[--lt-size:1.875rem]">{b.text}</h2>;
        case 'h3': return <h3 key={i} className="lt-blog-title mb-3 mt-8 font-semibold break-words [--lt-size:1.25rem] [--lt-lh:1.35]">{b.text}</h3>;
        case 'p': return <p key={i} className="my-5 whitespace-pre-line break-words">{b.text}</p>;
        case 'quote': return <blockquote key={i} className="my-8 border-s-4 border-primary ps-5 text-xl italic text-light-text/90 break-words dark:border-primary-dark dark:text-dark-text/90">{b.text}</blockquote>;
        case 'ul': return <ul key={i} className="my-5 list-disc space-y-2 ps-6 marker:text-primary dark:marker:text-primary-dark">{(b.items ?? []).map((item, j) => <li key={j} className="break-words">{item}</li>)}</ul>;
        case 'ol': return <ol key={i} className="my-5 list-decimal space-y-2 ps-6 marker:font-semibold marker:text-primary dark:marker:text-primary-dark">{(b.items ?? []).map((item, j) => <li key={j} className="break-words">{item}</li>)}</ol>;
        case 'image': return b.url ? (
          <figure key={i} className="my-8">
            <img src={ImagesService.getInstance().getImage(b.url)} alt="" loading="lazy" decoding="async" className="w-full rounded-design-card object-cover" />
            {b.caption && <figcaption className="mt-2 text-center text-sm text-light-text/70 break-words dark:text-dark-text/70">{b.caption}</figcaption>}
          </figure>
        ) : null;
        default: return null;
      }
    })}
  </div>
);

/**
 * LT-610: a post at its own address. 'classic': the picture above a column of
 * text; 'wide': the picture wide behind the title (classic when there is no
 * picture). From a card seen on this visit the title and picture draw at once.
 */
const PostPage: React.FC<Props> = ({ slug, businessName, logo, timeZone, layout = 'classic', blogTitle, cta, draft }) => {
  const { t } = useLanguage();
  const { go } = useSiteNav();
  const f = useBlogFormat(timeZone);
  const [data, setData] = useState<Loaded | null | undefined>(() => {
    if (draft) return { post: draft, more: [] };
    const inline = readInlinePage('post') as { post?: unknown; more?: unknown[] } | null;
    const post = inline ? parsePost(inline.post) : null;
    if (post && post.slug === slug) {
      return { post, more: (Array.isArray(inline?.more) ? inline!.more : []).map(parsePostCard).filter((p): p is PostCard => !!p) };
    }
    const card = postCardOf(slug);
    return card ? { post: { ...card, body: [] }, more: [], partial: true } : undefined;
  });
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);

  // The preview's draft changes as the owner types.
  useEffect(() => { if (draft) setData({ post: draft, more: [] }); }, [draft]);

  useEffect(() => {
    if (draft || (data && !data.partial)) return;
    let live = true;
    WebConfigService.getInstance().getPost(window.location.hostname.split('.')[0], slug)
      .then((found) => {
        if (!live) return;
        if (found) rememberPosts(found.more);
        setData(found);
      })
      .catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [slug, data, draft]);

  const post = data?.post;
  useEffect(() => {
    if (!post) return;
    const before = document.title;
    document.title = `${post.title} | ${businessName}`;
    return () => { document.title = before; };
  }, [post, businessName]);

  if (data === null) return <NotFound />;
  if (failed && !post) return <p className="section-y text-center text-light-text dark:text-dark-text">{t('blog.failed')}</p>;
  if (!post) return <Loading isLoading={true} />;

  const url = typeof window !== 'undefined' ? `${window.location.origin}${BLOG_PATH}/${post.slug}` : '';
  const share = async () => {
    try {
      if (navigator.share) { await navigator.share({ title: post.title, url }); return; }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // the visitor closed the share sheet
    }
  };
  const updated = new Date(post.updatedAt).getTime() - new Date(post.publishedAt).getTime() > DAY_MS ? f.date(post.updatedAt) : '';
  const wide = layout === 'wide' && !!post.cover;
  const blogName = blogTitle?.trim() || t('blog.title');

  const crumbs = (light: boolean) => (
    <nav aria-label={t('products.breadcrumbs')} className={`mb-5 flex flex-wrap items-center gap-2 text-sm ${light ? 'text-white/85' : 'text-light-text/70 dark:text-dark-text/70'}`}>
      <a href="/" onClick={(e) => followLink(e, '/', go)} className="hover:underline">{t('nav.home')}</a>
      <span aria-hidden="true">/</span>
      <a href={BLOG_PATH} onClick={(e) => followLink(e, BLOG_PATH, go)} className="hover:underline">{blogName}</a>
    </nav>
  );
  const byline = (light: boolean) => (
    <div className={`mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm ${light ? 'text-white/90' : 'text-light-text/75 dark:text-dark-text/75'}`}>
      <BusinessMark name={businessName} logo={logo} className="h-9 w-9" />
      <span className="font-medium">{businessName}</span>
      <MetaDot />
      <time dateTime={post.publishedAt}>{f.date(post.publishedAt)}</time>
      <MetaDot />
      <span>{f.minutes(post.minutes)}</span>
      {updated && <><MetaDot /><span>{t('blog.updated', { date: updated })}</span></>}
    </div>
  );
  const chip = (light: boolean) => post.category ? (
    <p className={`mb-3 inline-block rounded-full px-3 py-1 text-xs font-semibold ${light ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary-readable dark:bg-primary-dark/15 dark:text-primary-dark-readable'}`}>{post.category}</p>
  ) : null;

  return (
    <article className="bg-light-bg pb-20 dark:bg-dark-bg" style={wide ? { paddingTop: 'var(--nav-offset, 0px)' } : undefined} data-testid="post-page" data-layout={wide ? 'wide' : 'classic'}>
      {wide ? (
        // Below the menu, never under it: the menu's words stay on the page's own colour.
        <header className="relative isolate flex min-h-[22rem] items-end overflow-hidden md:min-h-[28rem]">
          <PostCover post={post} eager className="absolute inset-0 -z-10 h-full w-full" />
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />
          <div className="mx-auto w-full max-w-3xl px-4 pb-10 pt-16">
            {crumbs(true)}
            {chip(true)}
            <h1 className="lt-blog-title font-bold text-white break-words [--lt-lh:1.15] [--lt-size:clamp(2rem,1.4rem+2.6vw,3.5rem)]">{post.title}</h1>
            {byline(true)}
          </div>
        </header>
      ) : (
        <header className="mx-auto max-w-3xl px-4" style={{ paddingTop: 'calc(var(--nav-offset, 0px) + 2.5rem)' }}>
          {crumbs(false)}
          {chip(false)}
          <h1 className="lt-blog-title font-bold text-light-text break-words [--lt-lh:1.15] [--lt-size:clamp(2rem,1.5rem+2vw,3.25rem)] dark:text-dark-text">{post.title}</h1>
          {byline(false)}
          {post.cover && <PostCover post={post} eager className="mt-8 aspect-video rounded-design-card" />}
        </header>
      )}

      <div className="mx-auto max-w-3xl px-4">
        {post.summary && <p className="mt-8 text-xl leading-relaxed text-light-text/80 break-words dark:text-dark-text/80">{post.summary}</p>}
        {data?.partial ? <div className="py-10"><Loading isLoading={true} /></div> : <PostBody blocks={post.body} />}

        <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-light-text/10 pt-6 dark:border-dark-text/10">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`${post.title} ${url}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-design border-2 border-light-text/20 px-5 py-2.5 text-sm font-semibold text-light-text transition-colors hover:border-primary dark:border-dark-text/20 dark:text-dark-text dark:hover:border-primary-dark"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            {t('blog.shareWhatsapp')}
          </a>
          <button
            type="button"
            onClick={share}
            className="inline-flex items-center gap-2 rounded-design border-2 border-light-text/20 px-5 py-2.5 text-sm font-semibold text-light-text transition-colors hover:border-primary dark:border-dark-text/20 dark:text-dark-text dark:hover:border-primary-dark"
          >
            {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Share2 className="h-4 w-4" aria-hidden="true" />}
            {copied ? t('products.copied') : t('products.share')}
          </button>
        </div>

        {cta && (
          <div className="mt-10 rounded-design-card bg-primary/[0.07] px-6 py-8 text-center dark:bg-primary-dark/10">
            <p className="text-lg font-semibold text-light-text break-words dark:text-dark-text">{businessName}</p>
            <a
              href={cta.href}
              onClick={(e) => followLink(e, cta.href, go)}
              className="mt-4 inline-flex items-center justify-center rounded-design bg-primary px-8 py-3.5 font-bold text-on-primary transition-opacity hover:opacity-90 dark:bg-primary-dark dark:text-on-primary-dark"
            >
              {cta.label}
            </a>
          </div>
        )}
      </div>

      {data && data.more.length > 0 && (
        <section aria-labelledby="post-more" className="mx-auto mt-16 max-w-5xl px-4">
          <h2 id="post-more" className="lt-blog-title mb-6 font-bold text-light-text break-words [--lt-size:1.5rem] dark:text-dark-text">{t('blog.more')}</h2>
          <div className="flex flex-wrap gap-8">
            {data.more.map((p) => <PostTile key={p.id} post={p} timeZone={timeZone} />)}
          </div>
        </section>
      )}
    </article>
  );
};

export default PostPage;
