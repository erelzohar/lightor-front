import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { followLink, useSiteNav } from '../../services/siteNav';
import { BLOG_PATH, type BlogSummary } from '../../models/Post';
import type { BlogSectionLayout, SectionHeader } from '../../models/DesignConfig';
import type { HeadingScale } from '../../services/artDirection';
import type { SectionTone } from '../SectionDivider';
import { TONE_BG } from '../blocks/blockUtils';
import SectionHeading from '../Layout/SectionHeading';
import { part } from '../../designs/parts';
import { PostTile } from './BlogParts';

// LT-610: the wide article cards and the carousel come in their own parts (LT-603).
const BlogArticles = part('blogArticles', (m) => m.default);
const BlogCarousel = part('blogCarousel', (m) => m.default);

interface Props {
  blog?: BlogSummary;
  config?: { title: string; description: string };
  layout?: BlogSectionLayout;
  header?: SectionHeader;
  headerScale?: HeadingScale;
  tone?: SectionTone;
  businessName?: string;
  logo?: string;
  timeZone?: string;
}

/** The fewest a look needs to read as what it is: the carousel stands its posts left, centre and right. */
const MIN: Record<BlogSectionLayout, number> = { latest: 1, article: 1, carousel: 3 };
export const sectionLookFor = (layout: BlogSectionLayout, count: number): BlogSectionLayout => (count < MIN[layout] ? 'article' : layout);

/**
 * LT-610: the home page's way into the blog: the newest posts in the
 * section's look (Erel's "latest blog", his article card, his carousel), and
 * the button to all of them.
 */
const BlogSection: React.FC<Props> = ({ blog, config, layout = 'latest', header, headerScale, tone = 'bg', businessName, logo, timeZone }) => {
  const { t, language } = useLanguage();
  const { go } = useSiteNav();
  const posts = blog?.latest ?? [];
  if (!posts.length) return null;
  const look = sectionLookFor(layout, posts.length);
  const shown = look === 'carousel' ? posts.slice(0, 6) : posts.slice(0, 3);
  const title = config?.title?.trim() || t('blog.title');
  const Arrow = language === 'he' || language === 'ar' ? ArrowLeft : ArrowRight;

  return (
    <section id="blog" className={`section-y ${TONE_BG[tone]} transition-colors duration-300 ${look === 'carousel' ? 'lt-clip-x' : ''}`} aria-label={title} data-testid="blog-section" data-layout={look}>
      <div className="container mx-auto px-4">
        <SectionHeading
          title={title}
          description={config?.description || undefined}
          titlePath="components.blog.title"
          descriptionPath="components.blog.description"
          variant={header}
          scale={headerScale}
          mb="mb-10 md:mb-14"
          descClass="text-xl text-light-text/80 dark:text-dark-text/80 max-w-2xl mx-auto"
        />
        {look === 'latest' ? (
          <div className="flex flex-wrap justify-center gap-8" data-testid="blog-latest">
            {shown.map((post) => <PostTile key={post.id} post={post} timeZone={timeZone} />)}
          </div>
        ) : look === 'article' ? (
          <BlogArticles posts={shown} timeZone={timeZone} businessName={businessName} logo={logo} tone={tone} />
        ) : (
          <BlogCarousel posts={shown} timeZone={timeZone} businessName={businessName} logo={logo} tone={tone} />
        )}
        <div className="mt-10 text-center">
          <a
            href={BLOG_PATH}
            onClick={(e) => followLink(e, BLOG_PATH, go)}
            className="inline-flex items-center gap-2 rounded-design border-2 border-primary px-7 py-3 font-bold text-primary-readable transition-colors hover:bg-primary hover:text-on-primary dark:border-primary-dark dark:text-primary-dark-readable dark:hover:bg-primary-dark dark:hover:text-on-primary-dark"
          >
            {t('blog.all', { count: blog?.total ?? posts.length })}
            <Arrow className="h-5 w-5" aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
};

export default BlogSection;
