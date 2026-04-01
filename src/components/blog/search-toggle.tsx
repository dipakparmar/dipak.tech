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

  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`overflow-hidden transition-all duration-200 ease-out ${
          open ? 'w-48 opacity-100' : 'w-0 opacity-0'
        }`}
      >
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Search posts..."
          className="w-full bg-transparent border-b border-muted-foreground/20 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground/40 transition-colors py-0.5"
        />
      </div>
      <button
        onClick={open ? handleClose : () => setOpen(true)}
        className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted"
        aria-label={open ? 'Close search' : 'Search posts'}
      >
        {open ? <X className="size-4" /> : <Search className="size-4" />}
      </button>
    </div>
  );
}
