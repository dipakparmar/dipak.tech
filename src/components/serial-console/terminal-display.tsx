'use client';

import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Terminal } from '@xterm/xterm';
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

  useEffect(() => {
    autoScrollRef.current = autoScroll;
  }, [autoScroll]);

  useEffect(() => {
    if (!containerRef.current) return;

    const terminal = new Terminal({
      fontSize,
      fontFamily:
        '"JetBrains Mono", "Fira Code", ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace',
      theme: {
        background: '#0d1117',
        foreground: '#c9d1d9',
        cursor: '#58a6ff',
        cursorAccent: '#0d1117',
        selectionBackground: '#264f78',
        selectionForeground: '#ffffff',
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
      },
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
  }, [fontSize, onData]);

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
      className="h-full w-full bg-[#0d1117]"
      style={{ padding: '8px' }}
    />
  );
});
