'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';

interface SearchToggleProps {
  onSearch: (query: string) => void;
}

export function SearchToggle({ onSearch }: SearchToggleProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  function handleChange(value: string) {
    setQuery(value);
    onSearch(value);
  }

  function handleClose() {
    setOpen(false);
    setQuery('');
    onSearch('');
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="p-2 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Search posts"
      >
        <Search className="size-4" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Search posts..."
        className="bg-transparent border-b border-muted-foreground/30 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground/50 transition-colors w-48"
      />
      <button
        onClick={handleClose}
        className="p-1 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Close search"
      >
        <X className="size-3" />
      </button>
    </div>
  );
}
