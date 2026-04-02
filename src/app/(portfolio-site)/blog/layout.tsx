import { ReactNode } from 'react';

export default function BlogLayout({ children }: { children: ReactNode }) {
  // Break out of parent's max-w-2xl (42rem) to max-w-3xl (48rem)
  // Negative margin = (48 - 42) / 2 = 3rem each side
  return (
    <div className="max-w-3xl -mx-3 px-0">
      {children}
    </div>
  );
}
