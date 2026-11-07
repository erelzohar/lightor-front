import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { PostCover, PostLink, useBlogFormat, type BlogListProps } from './BlogParts';
import './blog.css';

/**
 * LT-610 (Erel's blogs): square pictures with the post's topic in the corner,
 * the title and line, and a "read more" whose arrow slides out as another
 * slides in under a pointer; the date runs into a rule. Mirrored in Hebrew and
 * Arabic: the arrows point and slide the reading way.
 */
const BlogTagged: React.FC<BlogListProps> = ({ posts, timeZone }) => {
  const { t, language } = useLanguage();
  const f = useBlogFormat(timeZone);
  const rtl = language === 'he' || language === 'ar';
  const Arrow = rtl ? ArrowLeft : ArrowRight;
  const out = rtl ? '[@media(hover:hover)]:group-hover:-translate-x-8' : '[@media(hover:hover)]:group-hover:translate-x-8';
  return (
    <ul className="grid gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3" data-testid="blog-tagged">
      {posts.map((post, i) => (
        <li key={post.id}>
          <PostLink
            post={post}
            className="group flex h-full flex-col border border-light-text/15 bg-light-bg/60 transition-shadow dark:border-dark-text/15 dark:bg-dark-bg/60 [@media(hover:hover)]:hover:shadow-md"
          >
            <div className="relative mb-4 sm:mb-6">
              <PostCover post={post} eager={i < 3} className="aspect-square w-full" />
              {post.category && (
                <span className="absolute start-0 top-0 bg-white px-2 py-0.5 text-[10px] font-medium uppercase text-black break-words sm:px-3 sm:py-1 sm:text-xs dark:bg-gray-950/90 dark:text-gray-200">
                  #{post.category}
                </span>
              )}
            </div>
            <div className="flex flex-1 flex-col px-3 pb-3 sm:px-4 sm:pb-4">
              <h2 className="lt-blog-title mb-2 font-normal tracking-tight text-light-text break-words [--lt-size:1rem] sm:[--lt-size:1.125rem] md:[--lt-size:1.5rem] dark:text-dark-text">{post.title}</h2>
              {post.summary && <p className="mb-4 text-xs leading-relaxed text-light-text/75 break-words dark:text-dark-text/75 sm:mb-6 sm:text-sm">{post.summary}</p>}
              <div className="mt-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="flex items-center text-xs font-medium text-light-text dark:text-dark-text sm:text-sm">
                  <span className="relative me-2 overflow-hidden border border-light-text/20 p-2 transition-colors duration-300 ease-in dark:border-dark-text/20 sm:p-3 [@media(hover:hover)]:group-hover:bg-light-text [@media(hover:hover)]:group-hover:text-light-bg dark:[@media(hover:hover)]:group-hover:bg-dark-text dark:[@media(hover:hover)]:group-hover:text-dark-bg">
                    <Arrow aria-hidden="true" className={`h-3 w-3 opacity-100 transition-all duration-500 ease-in sm:h-4 sm:w-4 [@media(hover:hover)]:group-hover:opacity-0 ${out}`} />
                    <Arrow aria-hidden="true" className="absolute -start-4 top-1/2 h-3 w-3 -translate-y-1/2 transition-all duration-500 ease-in-out sm:-start-5 sm:h-4 sm:w-4 [@media(hover:hover)]:group-hover:start-2 sm:[@media(hover:hover)]:group-hover:start-3" />
                  </span>
                  {t('blog.readMore')}
                </span>
                <span className="flex items-center gap-2 text-[10px] text-light-text/65 dark:text-dark-text/65 sm:gap-3 sm:text-xs">
                  <time dateTime={post.publishedAt}>{f.date(post.publishedAt)}</time>
                  <span aria-hidden="true" className="w-6 border-t border-light-text/25 dark:border-dark-text/25 sm:w-16" />
                </span>
              </div>
            </div>
          </PostLink>
        </li>
      ))}
    </ul>
  );
};

export default BlogTagged;
