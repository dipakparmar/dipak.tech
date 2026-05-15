import { ReactNode } from 'react';

export default function BlogLayout({ children }: { children: ReactNode }) {
  // Parent (portfolio layout) is max-w-2xl mx-auto px-6 → ~624px usable.
  // We break out wider via negative horizontal margins so blog content can
  // reach max-w-3xl (~768px) on larger screens. Negative margins scale up
  // by breakpoint so narrow viewports don't overflow.
  //
  // `blog-layout` adds a fixed top scroll-fade gradient (via :before) so
  // content gracefully dissolves into the top edge as the reader scrolls,
  // matching the soft scroll fade Agentation uses.
  return (
    <div className="blog-layout max-w-3xl -mx-3 sm:-mx-8 md:-mx-16 lg:-mx-20 px-0">
      {children}
    </div>
  );
}
