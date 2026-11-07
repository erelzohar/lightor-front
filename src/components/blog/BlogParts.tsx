import React, { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import ImagesService from '../../services/ImagesService';
import WebConfigService from '../../services/WebConfigService';
import { readInlinePage } from '../../services/edgeShell';
import { followLink, useSiteNav } from '../../services/siteNav';
import { lastPostList, rememberPostList } from '../../services/postCards';
import { parsePostCard, postPath, type PostCard } from '../../models/Post';
import './blog.css';

/**
 * LT-610: what every look of the blog shares - the date in the business's own
 * clock and language, the minutes to read, the picture (or the post's first
 * letter on a tint when it has none), and the link that stays in the app.
 */

const LOCALES: Record<string, string> = { he: 'he-IL', en: 'en-GB', ar: 'ar-u-nu-latn', es: 'es-ES', fr: 'fr-FR' };

export const useBlogFormat = (timeZone?: string) => {
  const { t, language } = useLanguage();
  const format = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(LOCALES[language] ?? 'he-IL', { day: 'numeric', month: 'long', year: 'numeric', ...(timeZone ? { timeZone } : {}) });
    } catch {
      return new Intl.DateTimeFormat(LOCALES[language] ?? 'he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
    }
  }, [language, timeZone]);
  return {
    date: (iso: string): string => {
      const d = new Date(iso);
      return Number.isNaN(d.getTime()) ? '' : format.format(d);
    },
    minutes: (n: number): string => t('blog.minutes', { count: n }),
  };
};

export const MetaDot: React.FC = () => <span aria-hidden="true" className="inline-block h-1 w-1 shrink-0 rounded-full bg-current opacity-60" />;

/** The date and the minutes, in one line that wraps rather than cuts. */
export const PostMeta: React.FC<{ post: PostCard; timeZone?: string; className?: string; extra?: React.ReactNode }> = ({ post, timeZone, className = '', extra }) => {
  const f = useBlogFormat(timeZone);
  const date = f.date(post.publishedAt);
  return (
    <p className={`flex flex-wrap items-center gap-x-2 gap-y-1 ${className}`}>
      {extra}
      {extra && date && <MetaDot />}
      {date && <time dateTime={post.publishedAt}>{date}</time>}
      {date && <MetaDot />}
      <span>{f.minutes(post.minutes)}</span>
    </p>
  );
};

/** The post's picture, or its first letter on the site's colour. Always decorative: the title says it. */
export const PostCover: React.FC<{ post: Pick<PostCard, 'cover' | 'title'>; className?: string; eager?: boolean; imgClassName?: string }> = ({ post, className = '', eager = false, imgClassName = '' }) => {
  const [broken, setBroken] = useState(false);
  if (post.cover && !broken) {
    return (
      <div className={`overflow-hidden ${className}`}>
        <img
          src={ImagesService.getInstance().getImage(post.cover)}
          alt=""
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setBroken(true)}
          className={`h-full w-full object-cover ${imgClassName}`}
        />
      </div>
    );
  }
  return (
    <div aria-hidden="true" className={`flex items-center justify-center overflow-hidden bg-primary/10 dark:bg-primary-dark/15 ${className}`}>
      <span className="font-heading text-5xl font-bold text-primary/70 dark:text-primary-dark/80">{[...post.title.trim()][0] ?? ''}</span>
    </div>
  );
};

/** A link to a post that stays in the app (a modifier click opens a tab, as a browser does). */
export const PostLink: React.FC<{ post: Pick<PostCard, 'slug'>; className?: string; children: React.ReactNode; label?: string; tabIndex?: number }> = ({ post, className, children, label, tabIndex }) => {
  const { go } = useSiteNav();
  const href = postPath(post);
  return (
    <a href={href} onClick={(e) => followLink(e, href, go)} className={className} aria-label={label} tabIndex={tabIndex}>
      {children}
    </a>
  );
};

/** The business as the posts' writer: its logo, or its first letter. */
export const BusinessMark: React.FC<{ name?: string; logo?: string; className?: string }> = ({ name = '', logo, className = 'h-8 w-8' }) =>
  logo ? (
    <img src={ImagesService.getInstance().getImage(logo)} alt="" className={`${className} shrink-0 rounded-full border border-light-text/10 object-cover dark:border-dark-text/10`} />
  ) : (
    <span aria-hidden="true" className={`${className} flex shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary-readable dark:bg-primary-dark/20 dark:text-primary-dark-readable`}>
      {[...name.trim()][0] ?? ''}
    </span>
  );

/** A small card: the picture, the title, the topic or the date (the home page's "latest", a post's "more"). */
export const PostTile: React.FC<{ post: PostCard; timeZone?: string }> = ({ post, timeZone }) => {
  const f = useBlogFormat(timeZone);
  return (
    <PostLink post={post} className="group block w-full max-w-72 transition-transform duration-300 [@media(hover:hover)]:hover:-translate-y-0.5" >
      <PostCover post={post} className="aspect-[16/10] rounded-xl" imgClassName="transition-transform duration-500 [@media(hover:hover)]:group-hover:scale-105" />
      <h3 className="lt-blog-title mt-3 font-medium text-light-text break-words [--lt-size:1rem] dark:text-dark-text">{post.title}</h3>
      <p className="mt-1 text-xs font-medium text-primary dark:text-primary-dark">{post.category || f.date(post.publishedAt)}</p>
    </PostLink>
  );
};

/**
 * The blog's posts: the edge's inlined copy, else the last list of this visit,
 * else the API. `failed` once the API could not answer.
 */
export const usePostList = (drafts?: PostCard[]): { posts: PostCard[] | null; failed: boolean } => {
  const [fetched, setPosts] = useState<PostCard[] | null>(() => {
    if (drafts) return null;
    const inline = readInlinePage('blog');
    return Array.isArray(inline) ? inline.map(parsePostCard).filter((p): p is PostCard => !!p) : lastPostList();
  });
  const [failed, setFailed] = useState(false);
  const posts = drafts ?? fetched;
  useEffect(() => {
    if (drafts) return;
    if (posts) { rememberPostList(posts); return; }
    let live = true;
    WebConfigService.getInstance().getPosts(window.location.hostname.split('.')[0])
      .then((list) => { if (!live) return; rememberPostList(list); setPosts(list); })
      .catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [posts, drafts]);
  return { posts, failed };
};

/** Each look draws a list of cards from these. */
export interface BlogListProps {
  posts: PostCard[];
  timeZone?: string;
  businessName?: string;
  logo?: string;
  /** The section's own background, so a card stands on the other one. */
  tone?: 'bg' | 'surface';
}

/** Share a post: the system's sheet where there is one, else its address copied. */
export const sharePost = async (post: Pick<PostCard, 'slug' | 'title'>, copied: () => void): Promise<void> => {
  const url = `${window.location.origin}${postPath(post)}`;
  try {
    if (navigator.share) { await navigator.share({ title: post.title, url }); return; }
    await navigator.clipboard.writeText(url);
    copied();
  } catch {
    // the visitor closed the share sheet
  }
};
