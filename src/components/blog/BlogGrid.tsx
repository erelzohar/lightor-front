import React from 'react';
import { PostCover, PostLink, PostMeta, type BlogListProps } from './BlogParts';
import './blog.css';

/** LT-610 (Erel's blog-section): the grid's soft light, behind the page's top. */
export const GridLight: React.FC = () => (
  <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden opacity-70">
    <div className="lt-blog-light-a absolute start-0 top-0 h-[60rem] w-[28rem] -translate-y-[18rem] -rotate-45 rounded-full rtl:rotate-45" />
    <div className="lt-blog-light-b absolute start-0 top-0 h-[60rem] w-[12rem] -translate-y-1/2 translate-x-[5%] -rotate-45 rounded-full rtl:rotate-45" />
    <div className="lt-blog-light-b absolute start-0 top-0 h-[60rem] w-[12rem] -translate-y-[18rem] -rotate-45 rounded-full rtl:rotate-45" />
  </div>
);

/**
 * LT-610 (Erel's blog-section): the posts' cards in a grid - the picture, the
 * date and minutes, the title and the line, each card tinted under a pointer.
 * Nothing is cut (LT-510): a long title wraps and its card grows.
 */
const BlogGrid: React.FC<BlogListProps> = ({ posts, timeZone }) => (
  <div className="relative">
    <div aria-hidden="true" className="mb-6 h-px w-full border-b border-dashed border-light-text/20 dark:border-dark-text/20" />
    <ul className="grid gap-2 md:grid-cols-2 lg:grid-cols-3" data-testid="blog-grid">
      {posts.map((post, i) => (
        <li key={post.id}>
          <PostLink post={post} className="group flex h-full flex-col gap-2 rounded-lg p-2 transition-colors duration-75 active:bg-light-text/10 dark:active:bg-dark-text/10 [@media(hover:hover)]:hover:bg-light-text/[0.06] dark:[@media(hover:hover)]:hover:bg-dark-text/[0.08]">
            <PostCover post={post} eager={i < 3} className="aspect-video rounded-md" imgClassName="transition-transform duration-500 [@media(hover:hover)]:group-hover:scale-105" />
            <div className="space-y-2 px-2 pb-2">
              <PostMeta post={post} timeZone={timeZone} className="text-[11px] text-light-text/70 dark:text-dark-text/70 sm:text-xs" extra={post.category ? <span>{post.category}</span> : undefined} />
              <h2 className="lt-blog-title font-semibold tracking-tight text-light-text break-words [--lt-size:1.125rem] dark:text-dark-text">{post.title}</h2>
              {post.summary && <p className="text-sm text-light-text/75 break-words dark:text-dark-text/75">{post.summary}</p>}
            </div>
          </PostLink>
        </li>
      ))}
    </ul>
  </div>
);

export default BlogGrid;
