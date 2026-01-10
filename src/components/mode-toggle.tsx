'use client';

import { MoonIcon, SunIcon, DesktopIcon } from '@radix-ui/react-icons';
import { useSyncExternalStore } from 'react';

import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';

const emptySubscribe = () => () => {};

export function ModeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="rounded-full">
        <span className="h-[1.2rem] w-[1.2rem]" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="rounded-full relative overflow-hidden"
      onClick={cycleTheme}
      title={`Theme: ${theme}`}
    >
      <SunIcon
        className={`h-[1.2rem] w-[1.2rem] absolute transition-all duration-300 ${
          theme === 'light'
            ? 'rotate-0 scale-100 opacity-100'
            : '-rotate-90 scale-0 opacity-0'
        }`}
      />
      <MoonIcon
        className={`h-[1.2rem] w-[1.2rem] absolute transition-all duration-300 ${
          theme === 'dark'
            ? 'rotate-0 scale-100 opacity-100'
            : 'rotate-90 scale-0 opacity-0'
        }`}
      />
      <DesktopIcon
        className={`h-[1.2rem] w-[1.2rem] absolute transition-all duration-300 ${
          theme === 'system'
            ? 'rotate-0 scale-100 opacity-100'
            : 'rotate-90 scale-0 opacity-0'
        }`}
      />
      <span className="sr-only">Toggle theme: {theme}</span>
    </Button>
  );
}
