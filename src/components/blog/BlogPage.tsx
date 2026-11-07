import React, { useEffect, useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useEdit, useEditAttrs } from '../../services/editMode';
import { followLink, useSiteNav } from '../../services/siteNav';
import type { BlogLayout } from '../../models/DesignConfig';
import Loading from '../Loading';
import { part } from '../../designs/parts';
import { usePostList } from './BlogParts';
import type { PostCard } from '../../models/Post';

// LT-610: each look of the list in its own part (LT-603).
const BlogGrid = part('blogGrid', (m) => m.default);
const GridLight = part('blogGrid', (m) => m.GridLight);
const BlogTagged = part('blogTagged', (m) => m.default);
const BlogGlass = part('blogGlass', (m) => m.default);

interface Props {
  businessName: string;
  logo?: string;
  title?: string;
  description?: string;
  layout?: BlogLayout;
  timeZone?: string;
  /** In a preview (the editor's, the design pictures'): the newest posts the config carries are the list. */
  drafts?: PostCard[];
}

/** A page of the blog holds this many; "more posts" adds as many again. */
export const PAGE_SIZE = 12;

/**
 * LT-610: `/blog`: every post the site shows, newest first, in the look the
 * owner (or the site's style) chose.
 */
const BlogPage: React.FC<Props> = ({ businessName, logo, title, description, layout = 'grid', timeZone, drafts }) => {
  const { t } = useLanguage();
  const { go } = useSiteNav();
  const ed = useEditAttrs();
  const { editing } = useEdit();
  const { posts, failed } = usePostList(drafts);
  const [count, setCount] = useState(PAGE_SIZE);
  const heading = title?.trim() || t('blog.title');

  useEffect(() => {
    const before = document.title;
    document.title = `${heading} | ${businessName}`;
    return () => { document.title = before; };
  }, [heading, businessName]);

  if (failed) return <p className="section-y text-center text-light-text dark:text-dark-text">{t('blog.failed')}</p>;
  if (!posts) return <Loading isLoading={true} />;

  const shown = posts.slice(0, count);
  const List = layout === 'tagged' ? BlogTagged : layout === 'glass' ? BlogGlass : BlogGrid;

  return (
    <section className="relative isolate overflow-hidden bg-light-bg pb-20 dark:bg-dark-bg" style={{ paddingTop: 'calc(var(--nav-offset, 0px) + 2.5rem)' }} data-testid="blog-page" data-layout={layout}>
      {layout === 'grid' && <GridLight />}
      <div className={`relative mx-auto px-4 ${layout === 'grid' ? 'max-w-5xl' : 'container'}`}>
        <nav aria-label={t('products.breadcrumbs')} className="mb-4 text-sm text-light-text/70 dark:text-dark-text/70">
          <a href="/" onClick={(e) => followLink(e, '/', go)} className="hover:text-primary-readable dark:hover:text-primary-dark-readable">{t('nav.home')}</a>
        </nav>
        <h1 {...ed('components.blog.title')} className="text-4xl font-bold tracking-wide text-light-text break-words dark:text-dark-text md:text-5xl">{heading}</h1>
        {(description || editing) && (
          <p {...ed('components.blog.description')} className="mt-3 max-w-2xl text-lg text-light-text/80 break-words dark:text-dark-text/80">{description}</p>
        )}
        <div className="mt-8">
          <List posts={shown} timeZone={timeZone} businessName={businessName} logo={logo} />
        </div>
        {posts.length > shown.length && (
          <div className="mt-10 text-center">
            <button
              type="button"
              onClick={() => setCount((n) => n + PAGE_SIZE)}
              className="inline-flex items-center gap-2 rounded-design border-2 border-primary px-7 py-3 font-bold text-primary-readable transition-colors hover:bg-primary hover:text-on-primary dark:border-primary-dark dark:text-primary-dark-readable dark:hover:bg-primary-dark dark:hover:text-on-primary-dark"
            >
              {t('blog.loadMore')}
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default BlogPage;
