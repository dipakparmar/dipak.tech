'use client';

import { useEffect, useLayoutEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { useTheme } from 'next-themes';
import { Terminal, ITheme } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { SearchAddon } from '@xterm/addon-search';
import { WebglAddon } from '@xterm/addon-webgl';
import { ClipboardAddon } from '@xterm/addon-clipboard';
import { SerializeAddon } from '@xterm/addon-serialize';
import '@xterm/xterm/css/xterm.css';

interface TerminalDisplayProps {
  onData?: (data: string) => void;
  fontSize?: number;
  autoScroll?: boolean;
}

export interface TerminalDisplayHandle {
  write: (data: string) => void;
  writeln: (data: string) => void;
  writeBytes: (data: Uint8Array, asHex?: boolean) => void;
  clear: () => void;
  focus: () => void;
  search: (term: string) => boolean;
  searchNext: () => boolean;
  searchPrevious: () => boolean;
  clearSearch: () => void;
  serialize: () => string;
  serializeAsHtml: () => string;
}

// Theme-aware color palettes
const darkTheme: ITheme = {
  background: 'hsl(222.2 84% 4.9%)', // matches --background in dark mode
  foreground: 'hsl(210 40% 98%)', // matches --foreground in dark mode
  cursor: 'hsl(217.2 91.2% 59.8%)', // primary blue
  cursorAccent: 'hsl(222.2 84% 4.9%)',
  selectionBackground: 'hsl(217.2 91.2% 59.8% / 0.3)',
  selectionForeground: 'hsl(210 40% 98%)',
  black: '#484f58',
  red: '#ff7b72',
  green: '#3fb950',
  yellow: '#d29922',
  blue: '#58a6ff',
  magenta: '#bc8cff',
  cyan: '#39c5cf',
  white: '#b1bac4',
  brightBlack: '#6e7681',
  brightRed: '#ffa198',
  brightGreen: '#56d364',
  brightYellow: '#e3b341',
  brightBlue: '#79c0ff',
  brightMagenta: '#d2a8ff',
  brightCyan: '#56d4dd',
  brightWhite: '#f0f6fc',
};

const lightTheme: ITheme = {
  background: 'hsl(0 0% 100%)', // white background for light mode
  foreground: 'hsl(222.2 84% 4.9%)', // dark text
  cursor: 'hsl(221.2 83.2% 53.3%)', // primary blue
  cursorAccent: 'hsl(0 0% 100%)',
  selectionBackground: 'hsl(221.2 83.2% 53.3% / 0.2)',
  selectionForeground: 'hsl(222.2 84% 4.9%)',
  black: '#24292f',
  red: '#cf222e',
  green: '#116329',
  yellow: '#4d2d00',
  blue: '#0969da',
  magenta: '#8250df',
  cyan: '#1b7c83',
  white: '#6e7781',
  brightBlack: '#57606a',
  brightRed: '#a40e26',
  brightGreen: '#1a7f37',
  brightYellow: '#633c01',
  brightBlue: '#218bff',
  brightMagenta: '#a475f9',
  brightCyan: '#3192aa',
  brightWhite: '#8c959f',
};

export const TerminalDisplay = forwardRef<
  TerminalDisplayHandle,
  TerminalDisplayProps
>(function TerminalDisplay(
  { onData, fontSize = 13, autoScroll = true },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const searchAddonRef = useRef<SearchAddon | null>(null);
  const serializeAddonRef = useRef<SerializeAddon | null>(null);
  const autoScrollRef = useRef(autoScroll);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    autoScrollRef.current = autoScroll;
  }, [autoScroll]);

  // Update terminal theme when system theme changes
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.options.theme = resolvedTheme === 'dark' ? darkTheme : lightTheme;
    }
  }, [resolvedTheme]);

  // Update terminal font size dynamically (useLayoutEffect for smoother visual updates)
  useLayoutEffect(() => {
    if (terminalRef.current && fitAddonRef.current) {
      terminalRef.current.options.fontSize = fontSize;
      fitAddonRef.current.fit();
    }
  }, [fontSize]);

  useEffect(() => {
    if (!containerRef.current) return;

    const terminal = new Terminal({
      fontSize,
      fontFamily:
        '"JetBrains Mono", "Fira Code", ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace',
      theme: resolvedTheme === 'dark' ? darkTheme : lightTheme,
      cursorBlink: true,
      cursorStyle: 'bar',
      scrollback: 10000,
      convertEol: true,
      allowProposedApi: true,
    });

    // Core addons
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    const searchAddon = new SearchAddon();
    const clipboardAddon = new ClipboardAddon();
    const serializeAddon = new SerializeAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);
    terminal.loadAddon(searchAddon);
    terminal.loadAddon(clipboardAddon);
    terminal.loadAddon(serializeAddon);

    terminal.open(containerRef.current);

    // Try to load WebGL addon for better performance (may fail on some browsers)
    try {
      const webglAddon = new WebglAddon();
      webglAddon.onContextLoss(() => {
        webglAddon.dispose();
      });
      terminal.loadAddon(webglAddon);
    } catch {
      // WebGL not available, fallback to canvas renderer
      console.warn('WebGL addon not available, using canvas renderer');
    }

    requestAnimationFrame(() => {
      fitAddon.fit();
    });

    terminal.onData((data) => {
      onData?.(data);
    });

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;
    searchAddonRef.current = searchAddon;
    serializeAddonRef.current = serializeAddon;

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        fitAddon.fit();
      });
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      terminal.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onData]);

  useImperativeHandle(
    ref,
    () => ({
      write(data: string) {
        terminalRef.current?.write(data);
        if (autoScrollRef.current) {
          terminalRef.current?.scrollToBottom();
        }
      },
      writeln(data: string) {
        terminalRef.current?.writeln(data);
        if (autoScrollRef.current) {
          terminalRef.current?.scrollToBottom();
        }
      },
      writeBytes(data: Uint8Array, asHex = false) {
        if (asHex) {
          const hex = Array.from(data)
            .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
            .join(' ');
          terminalRef.current?.writeln(hex);
        } else {
          const decoder = new TextDecoder('utf-8', { fatal: false });
          terminalRef.current?.write(decoder.decode(data));
        }
        if (autoScrollRef.current) {
          terminalRef.current?.scrollToBottom();
        }
      },
      clear() {
        terminalRef.current?.clear();
      },
      focus() {
        terminalRef.current?.focus();
      },
      search(term: string) {
        return searchAddonRef.current?.findNext(term) ?? false;
      },
      searchNext() {
        return searchAddonRef.current?.findNext('') ?? false;
      },
      searchPrevious() {
        return searchAddonRef.current?.findPrevious('') ?? false;
      },
      clearSearch() {
        searchAddonRef.current?.clearDecorations();
      },
      serialize() {
        return serializeAddonRef.current?.serialize() ?? '';
      },
      serializeAsHtml() {
        return serializeAddonRef.current?.serializeAsHTML() ?? '';
      },
    }),
    []
  );

  return (
    <div
      ref={containerRef}
      className="h-full w-full bg-background"
    />
  );
});
