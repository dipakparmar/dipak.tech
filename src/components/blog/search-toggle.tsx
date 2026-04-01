'use client';

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useEffect, useState } from 'react';

import type { PostMeta } from '@/lib/blog';
import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SearchToggleProps {
  posts: PostMeta[];
}

export function SearchToggle({ posts }: SearchToggleProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  function handleSelect(slug: string) {
    setOpen(false);
    router.push(`/blog/${slug}`);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-2 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Search posts"
      >
        <Search className="size-4" />
      </button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search posts"
        description="Search blog posts by title, description, or tag"
      >
        <Command>
          <CommandInput placeholder="Search posts..." />
          <CommandList>
            <CommandEmpty>No posts found.</CommandEmpty>
            <CommandGroup heading="Posts">
              {posts.map((post) => (
                <CommandItem
                  key={post.slug}
                  value={`${post.title} ${post.description} ${post.tags.join(' ')}`}
                  onSelect={() => handleSelect(post.slug)}
                  className="flex-col items-start"
                >
                  <span className="font-medium">{post.title}</span>
                  <span className="text-muted-foreground text-xs truncate w-full">
                    {post.description}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
