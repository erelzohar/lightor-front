import React, { useState } from 'react';
import { Check, Share2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { BusinessMark, PostCover, PostLink, sharePost, useBlogFormat, type BlogListProps } from './BlogParts';
import './blog.css';

/**
 * LT-610 (Erel's article card for the home page): wide cards, the picture
 * beside the words on a wide screen and above them on a phone; the business
 * and the date under the line, and a share button. They rise in once and lift
 * under a pointer. The whole card is the post's link; the share button sits
 * above it.
 */
const BlogArticles: React.FC<BlogListProps> = ({ posts, timeZone, businessName, logo, tone = 'bg' }) => {
  const { t } = useLanguage();
  const f = useBlogFormat(timeZone);
  const [copied, setCopied] = useState<string | null>(null);
  const card = tone === 'surface' ? 'bg-light-bg dark:bg-dark-bg' : 'bg-light-surface dark:bg-dark-surface';
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6" data-testid="blog-articles">
      {posts.map((post, i) => (
        <div key={post.id} className="lt-blog-rise" style={{ '--lt-delay': `${i * 80}ms` } as React.CSSProperties}>
          <article className={`group relative flex flex-col overflow-hidden rounded-xl shadow-sm transition-[transform,box-shadow] duration-300 md:flex-row [@media(hover:hover)]:hover:scale-[1.02] [@media(hover:hover)]:hover:shadow-lg ${card}`}>
            <PostCover post={post} eager={i === 0} className="aspect-video md:aspect-auto md:w-2/5 md:min-h-[14rem]" />
            <div className="flex flex-1 flex-col justify-between gap-4 p-6 md:w-3/5">
              <div>
                <h3 className="lt-blog-title mb-2 font-semibold text-light-text break-words [--lt-size:1.25rem] [--lt-lh:1.25] dark:text-dark-text">
                  <PostLink post={post} className="after:absolute after:inset-0 after:content-['']">{post.title}</PostLink>
                </h3>
                {post.summary && <p className="text-sm text-light-text/75 break-words dark:text-dark-text/75">{post.summary}</p>}
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <BusinessMark name={businessName} logo={logo} className="h-9 w-9" />
                  <div className="min-w-0">
                    {businessName && <p className="text-sm font-medium text-light-text break-words dark:text-dark-text">{businessName}</p>}
                    <p className="text-xs text-light-text/65 dark:text-dark-text/65">
                      <time dateTime={post.publishedAt}>{f.date(post.publishedAt)}</time>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => sharePost(post, () => { setCopied(post.id); window.setTimeout(() => setCopied(null), 2000); })}
                  aria-label={copied === post.id ? t('products.copied') : t('products.share')}
                  className="relative z-[1] rounded-full p-2 text-light-text/70 transition-colors hover:bg-light-text/10 hover:text-light-text dark:text-dark-text/70 dark:hover:bg-dark-text/10 dark:hover:text-dark-text"
                >
                  {copied === post.id ? <Check className="h-4 w-4" aria-hidden="true" /> : <Share2 className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
            </div>
          </article>
        </div>
      ))}
    </div>
  );
};

export default BlogArticles;
