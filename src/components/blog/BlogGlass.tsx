import React from 'react';
import { BookOpen, Clock } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { BusinessMark, PostCover, PostLink, useBlogFormat, type BlogListProps } from './BlogParts';
import './blog.css';

/**
 * LT-610 (Erel's glass blog card): frosted cards that rise in once, the
 * picture under a soft fade with the topic on it, and under a pointer a
 * "read the post" over the picture; the business, the date and the minutes
 * below. Colours only change on hover (LT-351: no size transitions on iPhone).
 */
const BlogGlass: React.FC<BlogListProps> = ({ posts, timeZone, businessName, logo }) => {
  const { t } = useLanguage();
  const f = useBlogFormat(timeZone);
  return (
    <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" data-testid="blog-glass">
      {posts.map((post, i) => (
        <li key={post.id} className="lt-blog-rise" style={{ '--lt-delay': `${Math.min(i, 8) * 60}ms` } as React.CSSProperties}>
          <PostLink
            post={post}
            className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-light-text/10 bg-light-surface/40 backdrop-blur-md transition-[border-color,box-shadow] duration-300 dark:border-dark-text/10 dark:bg-dark-surface/40 [@media(hover:hover)]:hover:border-primary/50 [@media(hover:hover)]:hover:shadow-xl [@media(hover:hover)]:hover:shadow-primary/10 dark:[@media(hover:hover)]:hover:border-primary-dark/50"
          >
            <div className="relative aspect-video overflow-hidden">
              <PostCover post={post} eager={i < 3} className="h-full w-full" imgClassName="transition-transform duration-500 [@media(hover:hover)]:group-hover:scale-110" />
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-light-bg/80 to-transparent opacity-60 transition-opacity duration-300 dark:from-dark-bg/80 [@media(hover:hover)]:group-hover:opacity-40" />
              {post.category && (
                <span className="absolute bottom-3 start-3 max-w-[85%] rounded-full bg-light-bg/70 px-2.5 py-0.5 text-xs font-medium text-light-text break-words backdrop-blur-sm dark:bg-dark-bg/70 dark:text-dark-text">
                  {post.category}
                </span>
              )}
              <div aria-hidden="true" className="absolute inset-0 hidden items-center justify-center bg-light-bg/20 opacity-0 transition-opacity duration-300 dark:bg-dark-bg/20 [@media(hover:hover)]:flex [@media(hover:hover)]:group-hover:opacity-100">
                <span className="flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-on-primary shadow-lg shadow-primary/25 dark:bg-primary-dark dark:text-on-primary-dark">
                  <BookOpen className="h-4 w-4" />
                  {t('blog.readPost')}
                </span>
              </div>
            </div>
            <div className="flex flex-1 flex-col gap-4 p-5">
              <div className="space-y-2">
                <h2 className="lt-blog-title font-semibold tracking-tight text-light-text transition-colors break-words [--lt-size:1.25rem] [--lt-lh:1.25] dark:text-dark-text [@media(hover:hover)]:group-hover:text-primary-readable dark:[@media(hover:hover)]:group-hover:text-primary-dark-readable">{post.title}</h2>
                {post.summary && <p className="text-sm text-light-text/75 break-words dark:text-dark-text/75">{post.summary}</p>}
              </div>
              <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-light-text/10 pt-4 dark:border-dark-text/10">
                <div className="flex min-w-0 items-center gap-2">
                  <BusinessMark name={businessName} logo={logo} />
                  <div className="flex min-w-0 flex-col text-xs">
                    {businessName && <span className="font-medium text-light-text break-words dark:text-dark-text">{businessName}</span>}
                    <time dateTime={post.publishedAt} className="text-light-text/65 dark:text-dark-text/65">{f.date(post.publishedAt)}</time>
                  </div>
                </div>
                <span className="flex items-center gap-1 text-xs text-light-text/65 dark:text-dark-text/65">
                  <Clock aria-hidden="true" className="h-3 w-3" />
                  {f.minutes(post.minutes)}
                </span>
              </div>
            </div>
          </PostLink>
        </li>
      ))}
    </ul>
  );
};

export default BlogGlass;
