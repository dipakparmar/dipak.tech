'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Usb,
  Unplug,
  Settings,
  Trash2,
  Download,
  Maximize2,
  Minimize2,
  AlertTriangle,
  Circle,
  Globe,
  Terminal,
  Network,
  Search,
  ChevronUp,
  ChevronDown,
  X,
  Plus,
  Minus,
} from 'lucide-react';
import {
  TerminalDisplay,
  type TerminalDisplayHandle,
} from './terminal-display';
import type {
  ConnectionType,
  SerialSettings,
  WebSocketSettings,
  SSHSettings,
  TelnetSettings,
  TerminalSettings,
  TabState,
} from '@/types/serial';
import {
  DEFAULT_TERMINAL_SETTINGS,
  createDefaultTab,
} from '@/types/serial';
import {
  isWebSerialSupported,
  stringToBytes,
  bytesToString,
  formatTimestamp,
  COMMON_BAUD_RATES,
} from '@/lib/serial-utils';

const CONNECTION_ICONS: Record<ConnectionType, React.ReactNode> = {
  serial: <Usb className="h-4 w-4" />,
  websocket: <Globe className="h-4 w-4" />,
  ssh: <Terminal className="h-4 w-4" />,
  telnet: <Network className="h-4 w-4" />,
};

const CONNECTION_LABELS: Record<ConnectionType, string> = {
  serial: 'Serial',
  websocket: 'WebSocket',
  ssh: 'SSH',
  telnet: 'Telnet',
};

// Connection refs stored per tab
interface TabConnections {
  port: SerialPort | null;
  ws: WebSocket | null;
  reader: ReadableStreamDefaultReader<Uint8Array> | null;
  writer: WritableStreamDefaultWriter<Uint8Array> | null;
  readLoopActive: boolean;
}

export function SerialConsole() {
  // Tab management
  const [tabs, setTabs] = useState<TabState[]>(() => [
    createDefaultTab(crypto.randomUUID(), 'serial'),
  ]);
  const [activeTabId, setActiveTabId] = useState<string>(tabs[0].id);

  // Global state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionDialogOpen, setConnectionDialogOpen] = useState(false);
  const [sshPassword, setSshPassword] = useState('');

  // Terminal settings (shared across tabs)
  const [terminalSettings, setTerminalSettings] = useState<TerminalSettings>(
    DEFAULT_TERMINAL_SETTINGS
  );
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [fontSize, setFontSize] = useState(13);

  // Local command buffer for when not connected
  const localInputBuffer = useRef<Map<string, string>>(new Map());

  // Refs - stored per tab
  const terminalRefs = useRef<Map<string, TerminalDisplayHandle | null>>(new Map());
  const connectionsRef = useRef<Map<string, TabConnections>>(new Map());
  const welcomeShownRef = useRef<Set<string>>(new Set());
  const searchInputRef = useRef<HTMLInputElement>(null);
  const handleDisconnectRef = useRef<(tabId: string) => Promise<void>>(() => Promise.resolve());

  // Get active tab
  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

  // Get or create connection refs for a tab
  const getConnections = useCallback((tabId: string): TabConnections => {
    if (!connectionsRef.current.has(tabId)) {
      connectionsRef.current.set(tabId, {
        port: null,
        ws: null,
        reader: null,
        writer: null,
        readLoopActive: false,
      });
    }
    return connectionsRef.current.get(tabId)!;
  }, []);

  // Update tab state helper
  const updateTab = useCallback((tabId: string, updates: Partial<TabState>) => {
    setTabs((prev) =>
      prev.map((tab) => (tab.id === tabId ? { ...tab, ...updates } : tab))
    );
  }, []);

  // Check Web Serial API support
  const isSupported = activeTab.connectionType !== 'serial' || isWebSerialSupported();
  const error = !isSupported ? 'Web Serial API not supported. Use Chrome, Edge, or Opera.' : null;

  // Set responsive font size based on screen width
  useEffect(() => {
    const updateFontSize = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setFontSize(11);
      } else if (width < 1024) {
        setFontSize(12);
      } else {
        setFontSize(13);
      }
    };
    updateFontSize();
    window.addEventListener('resize', updateFontSize);
    return () => window.removeEventListener('resize', updateFontSize);
  }, []);

  // Add log entry to tab
  const addLogEntry = useCallback(
    (tabId: string, direction: 'tx' | 'rx', data: string, rawBytes?: Uint8Array) => {
      setTabs((prev) =>
        prev.map((tab) =>
          tab.id === tabId
            ? { ...tab, sessionLog: [...tab.sessionLog, { timestamp: new Date(), direction, data, rawBytes }] }
            : tab
        )
      );
    },
    []
  );

  // Handle received data
  const handleReceivedData = useCallback(
    (tabId: string, data: string | Uint8Array) => {
      let text: string;
      let bytes: Uint8Array | undefined;

      if (data instanceof Uint8Array) {
        bytes = data;
        text = bytesToString(data);
      } else {
        text = data;
        bytes = stringToBytes(data);
      }

      const terminal = terminalRefs.current.get(tabId);
      if (terminalSettings.hexView && bytes) {
        terminal?.writeBytes(bytes, true);
      } else {
        if (terminalSettings.timestamps) {
          terminal?.write(`\x1b[90m[${formatTimestamp(new Date())}]\x1b[0m `);
        }
        terminal?.write(text);
      }
      addLogEntry(tabId, 'rx', text, bytes);
    },
    [terminalSettings.hexView, terminalSettings.timestamps, addLogEntry]
  );

  // Serial read loop
  const startSerialReadLoop = useCallback(
    async (tabId: string) => {
      const conn = getConnections(tabId);
      if (!conn.port?.readable || conn.readLoopActive) return;
      conn.readLoopActive = true;

      try {
        const reader = conn.port.readable.getReader();
        conn.reader = reader;

        while (conn.readLoopActive) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value && value.length > 0) {
            handleReceivedData(tabId, value);
          }
        }
        reader.releaseLock();
      } catch (err) {
        if (conn.readLoopActive) {
          console.error('Read error:', err);
        }
      } finally {
        conn.reader = null;
        conn.readLoopActive = false;
      }
    },
    [getConnections, handleReceivedData]
  );

  // Connect handlers for different connection types
  const handleSerialConnect = useCallback(
    async (tabId: string, settings: SerialSettings) => {
      if (!isWebSerialSupported()) return;

      const port = await navigator.serial.requestPort();
      const conn = getConnections(tabId);
      conn.port = port;

      await port.open({
        baudRate: settings.baudRate,
        dataBits: settings.dataBits,
        stopBits: settings.stopBits,
        parity: settings.parity,
        flowControl: settings.flowControl,
      });

      if (port.writable) {
        conn.writer = port.writable.getWriter();
      }

      updateTab(tabId, { isConnected: true });
      terminalRefs.current.get(tabId)?.writeln(
        `\x1b[32mConnected to serial port at ${settings.baudRate} baud\x1b[0m`
      );
      startSerialReadLoop(tabId);

      port.addEventListener('disconnect', () => {
        handleDisconnectRef.current(tabId);
        terminalRefs.current.get(tabId)?.writeln('\x1b[31mDevice disconnected\x1b[0m');
      });
    },
    [getConnections, updateTab, startSerialReadLoop]
  );

  const handleWebSocketConnect = useCallback(
    async (tabId: string, settings: WebSocketSettings) => {
      return new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(settings.url, settings.protocols);
        const conn = getConnections(tabId);
        conn.ws = ws;
        ws.binaryType = 'arraybuffer';

        ws.onopen = () => {
          updateTab(tabId, { isConnected: true });
          terminalRefs.current.get(tabId)?.writeln(
            `\x1b[32mConnected to WebSocket: ${settings.url}\x1b[0m`
          );
          resolve();
        };

        ws.onmessage = (event) => {
          if (event.data instanceof ArrayBuffer) {
            handleReceivedData(tabId, new Uint8Array(event.data));
          } else {
            handleReceivedData(tabId, event.data);
          }
        };

        ws.onerror = () => reject(new Error('WebSocket connection failed'));

        ws.onclose = (event) => {
          updateTab(tabId, { isConnected: false });
          conn.ws = null;
          terminalRefs.current.get(tabId)?.writeln(
            `\x1b[33mWebSocket disconnected${event.reason ? `: ${event.reason}` : ''}\x1b[0m`
          );
        };
      });
    },
    [getConnections, updateTab, handleReceivedData]
  );

  const handleSSHConnect = useCallback(
    async (tabId: string, settings: SSHSettings, password: string) => {
      return new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(settings.proxyUrl);
        const conn = getConnections(tabId);
        conn.ws = ws;
        ws.binaryType = 'arraybuffer';

        ws.onopen = () => {
          ws.send(JSON.stringify({
            type: 'connect',
            host: settings.host,
            port: settings.port,
            username: settings.username,
            password,
          }));
        };

        ws.onmessage = (event) => {
          if (typeof event.data === 'string') {
            try {
              const msg = JSON.parse(event.data);
              if (msg.type === 'connected') {
                updateTab(tabId, { isConnected: true });
                terminalRefs.current.get(tabId)?.writeln(
                  `\x1b[32mConnected to SSH: ${settings.username}@${settings.host}:${settings.port}\x1b[0m`
                );
                resolve();
              } else if (msg.type === 'error') {
                reject(new Error(msg.message || 'SSH connection failed'));
              } else if (msg.type === 'data') {
                handleReceivedData(tabId, msg.data);
              }
            } catch {
              handleReceivedData(tabId, event.data);
            }
          } else if (event.data instanceof ArrayBuffer) {
            handleReceivedData(tabId, new Uint8Array(event.data));
          }
        };

        ws.onerror = () => reject(new Error('SSH proxy connection failed'));

        ws.onclose = (event) => {
          updateTab(tabId, { isConnected: false });
          conn.ws = null;
          terminalRefs.current.get(tabId)?.writeln(
            `\x1b[33mSSH disconnected${event.reason ? `: ${event.reason}` : ''}\x1b[0m`
          );
        };
      });
    },
    [getConnections, updateTab, handleReceivedData]
  );

  const handleTelnetConnect = useCallback(
    async (tabId: string, settings: TelnetSettings) => {
      return new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(settings.proxyUrl);
        const conn = getConnections(tabId);
        conn.ws = ws;
        ws.binaryType = 'arraybuffer';

        ws.onopen = () => {
          ws.send(JSON.stringify({
            type: 'connect',
            host: settings.host,
            port: settings.port,
          }));
        };

        ws.onmessage = (event) => {
          if (typeof event.data === 'string') {
            try {
              const msg = JSON.parse(event.data);
              if (msg.type === 'connected') {
                updateTab(tabId, { isConnected: true });
                terminalRefs.current.get(tabId)?.writeln(
                  `\x1b[32mConnected to Telnet: ${settings.host}:${settings.port}\x1b[0m`
                );
                resolve();
              } else if (msg.type === 'error') {
                reject(new Error(msg.message || 'Telnet connection failed'));
              } else if (msg.type === 'data') {
                handleReceivedData(tabId, msg.data);
              }
            } catch {
              handleReceivedData(tabId, event.data);
            }
          } else if (event.data instanceof ArrayBuffer) {
            handleReceivedData(tabId, new Uint8Array(event.data));
          }
        };

        ws.onerror = () => reject(new Error('Telnet proxy connection failed'));

        ws.onclose = (event) => {
          updateTab(tabId, { isConnected: false });
          conn.ws = null;
          terminalRefs.current.get(tabId)?.writeln(
            `\x1b[33mTelnet disconnected${event.reason ? `: ${event.reason}` : ''}\x1b[0m`
          );
        };
      });
    },
    [getConnections, updateTab, handleReceivedData]
  );

  // Main connect handler
  const handleConnect = useCallback(async () => {
    if (!isSupported) return;
    setIsConnecting(true);
    setConnectionDialogOpen(false);

    const tab = activeTab;
    try {
      switch (tab.connectionType) {
        case 'serial':
          await handleSerialConnect(tab.id, tab.serialSettings);
          break;
        case 'websocket':
          await handleWebSocketConnect(tab.id, tab.wsSettings);
          break;
        case 'ssh':
          await handleSSHConnect(tab.id, tab.sshSettings, sshPassword);
          break;
        case 'telnet':
          await handleTelnetConnect(tab.id, tab.telnetSettings);
          break;
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'NotFoundError') {
        terminalRefs.current.get(tab.id)?.writeln(`\x1b[31mError: ${err.message}\x1b[0m`);
      }
    } finally {
      setIsConnecting(false);
    }
  }, [isSupported, activeTab, sshPassword, handleSerialConnect, handleWebSocketConnect, handleSSHConnect, handleTelnetConnect]);

  // Disconnect
  const handleDisconnect = useCallback(async (tabId: string) => {
    const conn = getConnections(tabId);
    conn.readLoopActive = false;

    if (conn.ws) {
      conn.ws.close();
      conn.ws = null;
    }

    if (conn.reader) {
      try {
        await conn.reader.cancel();
        conn.reader.releaseLock();
      } catch { /* ignore */ }
      conn.reader = null;
    }

    if (conn.writer) {
      try {
        await conn.writer.close();
      } catch { /* ignore */ }
      conn.writer = null;
    }

    if (conn.port) {
      try {
        await conn.port.close();
      } catch { /* ignore */ }
      conn.port = null;
    }

    updateTab(tabId, { isConnected: false });
    terminalRefs.current.get(tabId)?.writeln('\x1b[33mDisconnected\x1b[0m');
  }, [getConnections, updateTab]);

  // Keep handleDisconnect ref updated
  useEffect(() => {
    handleDisconnectRef.current = handleDisconnect;
  }, [handleDisconnect]);

  // Send data
  const handleSend = useCallback(
    async (data: string) => {
      if (!data || !activeTab.isConnected) return;

      const lineEndings: Record<string, string> = {
        none: '',
        cr: '\r',
        lf: '\n',
        crlf: '\r\n',
      };
      const dataToSend = data + lineEndings[terminalSettings.lineEnding];
      const bytes = stringToBytes(dataToSend);
      const conn = getConnections(activeTab.id);

      try {
        if (activeTab.connectionType === 'serial' && conn.writer) {
          await conn.writer.write(bytes);
        } else if (conn.ws && conn.ws.readyState === WebSocket.OPEN) {
          if (activeTab.connectionType === 'ssh' || activeTab.connectionType === 'telnet') {
            conn.ws.send(JSON.stringify({ type: 'data', data: dataToSend }));
          } else {
            conn.ws.send(dataToSend);
          }
        } else {
          return;
        }

        const terminal = terminalRefs.current.get(activeTab.id);
        if (terminalSettings.localEcho) {
          if (terminalSettings.hexView) {
            terminal?.writeBytes(bytes, true);
          } else {
            terminal?.write(`\x1b[36m${dataToSend}\x1b[0m`);
          }
        }
        addLogEntry(activeTab.id, 'tx', dataToSend, bytes);
      } catch (err) {
        console.error('Send error:', err);
      }
    },
    [activeTab, terminalSettings, getConnections, addLogEntry]
  );

  // Process local commands when not connected
  const processLocalCommand = useCallback((tabId: string, command: string) => {
    const terminal = terminalRefs.current.get(tabId);
    if (!terminal) return;

    const cmd = command.trim().toLowerCase();
    const args = command.trim().split(/\s+/).slice(1);

    switch (cmd.split(' ')[0]) {
      case 'help':
        terminal.writeln('');
        terminal.writeln('\x1b[33mAvailable commands:\x1b[0m');
        terminal.writeln('  \x1b[36mhelp\x1b[0m       - Show this help message');
        terminal.writeln('  \x1b[36mclear\x1b[0m      - Clear the terminal');
        terminal.writeln('  \x1b[36mecho\x1b[0m <msg> - Echo a message');
        terminal.writeln('  \x1b[36mdate\x1b[0m       - Show current date/time');
        terminal.writeln('  \x1b[36minfo\x1b[0m       - Show connection info');
        terminal.writeln('');
        terminal.writeln('\x1b[90mConnect to a device to send commands to it.\x1b[0m');
        break;
      case 'clear':
        terminal.clear();
        break;
      case 'echo':
        terminal.writeln(args.join(' ') || '');
        break;
      case 'date':
        terminal.writeln(new Date().toString());
        break;
      case 'info':
        const tab = tabs.find(t => t.id === tabId);
        if (tab) {
          terminal.writeln('');
          terminal.writeln(`\x1b[33mConnection Type:\x1b[0m ${CONNECTION_LABELS[tab.connectionType]}`);
          terminal.writeln(`\x1b[33mStatus:\x1b[0m ${tab.isConnected ? '\x1b[32mConnected\x1b[0m' : '\x1b[31mDisconnected\x1b[0m'}`);
          if (tab.connectionType === 'serial') {
            terminal.writeln(`\x1b[33mBaud Rate:\x1b[0m ${tab.serialSettings.baudRate}`);
          } else if (tab.connectionType === 'websocket') {
            terminal.writeln(`\x1b[33mURL:\x1b[0m ${tab.wsSettings.url}`);
          } else if (tab.connectionType === 'ssh') {
            terminal.writeln(`\x1b[33mHost:\x1b[0m ${tab.sshSettings.username}@${tab.sshSettings.host}:${tab.sshSettings.port}`);
          } else if (tab.connectionType === 'telnet') {
            terminal.writeln(`\x1b[33mHost:\x1b[0m ${tab.telnetSettings.host}:${tab.telnetSettings.port}`);
          }
        }
        break;
      default:
        if (command.trim()) {
          terminal.writeln(`\x1b[31mCommand not found:\x1b[0m ${command.trim()}`);
          terminal.writeln('\x1b[90mType "help" for available commands.\x1b[0m');
        }
    }
  }, [tabs]);

  // Terminal keyboard input
  const handleTerminalData = useCallback(
    (data: string) => {
      const terminal = terminalRefs.current.get(activeTab.id);
      if (!terminal) return;

      // If connected, send data to the connection
      if (activeTab.isConnected) {
        handleSend(data);
        return;
      }

      // Local shell mode when not connected
      const buffer = localInputBuffer.current.get(activeTab.id) || '';

      // Handle special characters
      if (data === '\r' || data === '\n') {
        // Enter key - process command
        terminal.writeln('');
        processLocalCommand(activeTab.id, buffer);
        localInputBuffer.current.set(activeTab.id, '');
        terminal.write('\x1b[36m$ \x1b[0m');
      } else if (data === '\x7f' || data === '\b') {
        // Backspace
        if (buffer.length > 0) {
          localInputBuffer.current.set(activeTab.id, buffer.slice(0, -1));
          terminal.write('\b \b');
        }
      } else if (data === '\x03') {
        // Ctrl+C
        localInputBuffer.current.set(activeTab.id, '');
        terminal.writeln('^C');
        terminal.write('\x1b[36m$ \x1b[0m');
      } else if (data >= ' ' && data <= '~') {
        // Printable characters
        localInputBuffer.current.set(activeTab.id, buffer + data);
        terminal.write(data);
      }
    },
    [activeTab.id, activeTab.isConnected, handleSend, processLocalCommand]
  );

  // Tab management
  const addTab = useCallback((connectionType: ConnectionType = 'serial') => {
    const newTab = createDefaultTab(crypto.randomUUID(), connectionType);
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
  }, []);

  const closeTab = useCallback(
    async (tabId: string) => {
      const tab = tabs.find((t) => t.id === tabId);
      if (tab?.isConnected) {
        await handleDisconnect(tabId);
      }
      // Clean up refs
      terminalRefs.current.delete(tabId);
      connectionsRef.current.delete(tabId);
      welcomeShownRef.current.delete(tabId);

      setTabs((prev) => {
        const newTabs = prev.filter((t) => t.id !== tabId);
        if (newTabs.length === 0) {
          // Always keep at least one tab
          const newTab = createDefaultTab(crypto.randomUUID(), 'serial');
          return [newTab];
        }
        return newTabs;
      });

      // Switch to another tab if closing active
      if (activeTabId === tabId) {
        setTabs((prev) => {
          const remaining = prev.filter((t) => t.id !== tabId);
          if (remaining.length > 0) {
            setActiveTabId(remaining[remaining.length - 1].id);
          }
          return prev;
        });
      }
    },
    [tabs, activeTabId, handleDisconnect]
  );

  // Export log
  const handleExportLog = useCallback(() => {
    if (activeTab.sessionLog.length === 0) return;
    const content = activeTab.sessionLog
      .map((e) => `[${e.timestamp.toISOString()}] [${e.direction.toUpperCase()}] ${e.data}`)
      .join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `terminal-${activeTab.connectionType}-${new Date().toISOString().split('T')[0]}.log`;
    a.click();
    URL.revokeObjectURL(url);
  }, [activeTab]);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  // Search handlers
  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    const terminal = terminalRefs.current.get(activeTabId);
    if (term) {
      terminal?.search(term);
    } else {
      terminal?.clearSearch();
    }
  }, [activeTabId]);

  const handleSearchNext = useCallback(() => {
    if (searchTerm) {
      terminalRefs.current.get(activeTabId)?.search(searchTerm);
    }
  }, [searchTerm, activeTabId]);

  const handleSearchPrevious = useCallback(() => {
    if (searchTerm) {
      terminalRefs.current.get(activeTabId)?.searchPrevious();
    }
  }, [searchTerm, activeTabId]);

  const toggleSearch = useCallback(() => {
    setShowSearch((prev) => {
      if (!prev) {
        setTimeout(() => searchInputRef.current?.focus(), 0);
      } else {
        terminalRefs.current.get(activeTabId)?.clearSearch();
        setSearchTerm('');
      }
      return !prev;
    });
  }, [activeTabId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showSearch) {
          toggleSearch();
        } else if (isFullscreen) {
          setIsFullscreen(false);
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        if (!showSearch) {
          toggleSearch();
        } else {
          searchInputRef.current?.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, showSearch, toggleSearch]);

  // Focus terminal when connected
  useEffect(() => {
    if (activeTab.isConnected) {
      terminalRefs.current.get(activeTab.id)?.focus();
    }
  }, [activeTab.isConnected, activeTab.id]);

  // Show welcome message when tab changes connection type
  const showWelcomeMessage = useCallback((tabId: string, type: ConnectionType) => {
    const terminal = terminalRefs.current.get(tabId);
    if (!terminal) return;

    terminal.writeln('');
    terminal.writeln('\x1b[1;36m╔════════════════════════════════════════════════════════╗\x1b[0m');
    terminal.writeln('\x1b[1;36m║\x1b[0m  \x1b[1;37mWeb Terminal\x1b[0m                                          \x1b[1;36m║\x1b[0m');
    terminal.writeln('\x1b[1;36m╚════════════════════════════════════════════════════════╝\x1b[0m');
    terminal.writeln('');

    switch (type) {
      case 'serial':
        terminal.writeln('\x1b[33mSerial Port Connection\x1b[0m');
        terminal.writeln('  Connect to USB/serial devices like Arduino, ESP32, Raspberry Pi.');
        terminal.writeln('  Configure baud rate, data bits, stop bits, and parity.');
        terminal.writeln('');
        terminal.writeln('\x1b[90mNote: Requires Chrome, Edge, or Opera with Web Serial API.\x1b[0m');
        break;
      case 'websocket':
        terminal.writeln('\x1b[33mWebSocket Connection\x1b[0m');
        terminal.writeln('  Connect to WebSocket servers for real-time communication.');
        terminal.writeln('  Supports both text and binary protocols.');
        terminal.writeln('');
        terminal.writeln('\x1b[90mExample: ws://localhost:8080 or wss://example.com/ws\x1b[0m');
        break;
      case 'ssh':
        terminal.writeln('\x1b[33mSSH Connection\x1b[0m');
        terminal.writeln('  Connect to SSH servers via WebSocket proxy.');
        terminal.writeln('  Requires a WebSocket-to-SSH proxy server running.');
        terminal.writeln('');
        terminal.writeln('\x1b[90mProxy handles SSH protocol - browser cannot do raw TCP.\x1b[0m');
        break;
      case 'telnet':
        terminal.writeln('\x1b[33mTelnet Connection\x1b[0m');
        terminal.writeln('  Connect to Telnet servers via WebSocket proxy.');
        terminal.writeln('  Requires a WebSocket-to-Telnet proxy server running.');
        terminal.writeln('');
        terminal.writeln('\x1b[90mProxy handles Telnet protocol - browser cannot do raw TCP.\x1b[0m');
        break;
    }

    terminal.writeln('');
    terminal.writeln('\x1b[33mKeyboard shortcuts:\x1b[0m');
    terminal.writeln('  • \x1b[36mCtrl+F\x1b[0m  Search terminal');
    terminal.writeln('  • \x1b[36mESC\x1b[0m     Exit fullscreen / Close search');
    terminal.writeln('');
    terminal.writeln('\x1b[90mType "help" for local commands. Click connect button to start.\x1b[0m');
    terminal.writeln('');
    terminal.write('\x1b[36m$ \x1b[0m');
  }, []);

  // Update connection type for active tab
  const setConnectionType = useCallback((type: ConnectionType) => {
    updateTab(activeTabId, {
      connectionType: type,
      title: `${CONNECTION_LABELS[type]} ${activeTabId.slice(-4)}`,
    });
    setTimeout(() => showWelcomeMessage(activeTabId, type), 50);
  }, [activeTabId, updateTab, showWelcomeMessage]);

  // Update settings for active tab
  const setSerialSettings = useCallback(
    (updater: (s: SerialSettings) => SerialSettings) => {
      setTabs((prev) =>
        prev.map((tab) =>
          tab.id === activeTabId
            ? { ...tab, serialSettings: updater(tab.serialSettings) }
            : tab
        )
      );
    },
    [activeTabId]
  );

  const setWsSettings = useCallback(
    (updater: (s: WebSocketSettings) => WebSocketSettings) => {
      setTabs((prev) =>
        prev.map((tab) =>
          tab.id === activeTabId
            ? { ...tab, wsSettings: updater(tab.wsSettings) }
            : tab
        )
      );
    },
    [activeTabId]
  );

  const setSshSettings = useCallback(
    (updater: (s: SSHSettings) => SSHSettings) => {
      setTabs((prev) =>
        prev.map((tab) =>
          tab.id === activeTabId
            ? { ...tab, sshSettings: updater(tab.sshSettings) }
            : tab
        )
      );
    },
    [activeTabId]
  );

  const setTelnetSettings = useCallback(
    (updater: (s: TelnetSettings) => TelnetSettings) => {
      setTabs((prev) =>
        prev.map((tab) =>
          tab.id === activeTabId
            ? { ...tab, telnetSettings: updater(tab.telnetSettings) }
            : tab
        )
      );
    },
    [activeTabId]
  );

  const containerClass = isFullscreen
    ? 'fixed inset-0 z-50 flex flex-col bg-background'
    : 'relative flex flex-col h-[500px] sm:h-[650px] rounded-xl overflow-hidden border bg-background shadow-xl';

  // Render connection settings dialog content
  const renderConnectionSettings = () => {
    switch (activeTab.connectionType) {
      case 'serial':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Baud Rate</Label>
                <Select
                  value={activeTab.serialSettings.baudRate.toString()}
                  onValueChange={(v) =>
                    setSerialSettings((s) => ({ ...s, baudRate: parseInt(v) }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_BAUD_RATES.map((rate) => (
                      <SelectItem key={rate} value={rate.toString()}>
                        {rate.toLocaleString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data Bits</Label>
                <Select
                  value={activeTab.serialSettings.dataBits.toString()}
                  onValueChange={(v) =>
                    setSerialSettings((s) => ({ ...s, dataBits: parseInt(v) as 7 | 8 }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7</SelectItem>
                    <SelectItem value="8">8</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Stop Bits</Label>
                <Select
                  value={activeTab.serialSettings.stopBits.toString()}
                  onValueChange={(v) =>
                    setSerialSettings((s) => ({ ...s, stopBits: parseInt(v) as 1 | 2 }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Parity</Label>
                <Select
                  value={activeTab.serialSettings.parity}
                  onValueChange={(v) =>
                    setSerialSettings((s) => ({ ...s, parity: v as 'none' | 'even' | 'odd' }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="even">Even</SelectItem>
                    <SelectItem value="odd">Odd</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Flow Control</Label>
              <Select
                value={activeTab.serialSettings.flowControl}
                onValueChange={(v) =>
                  setSerialSettings((s) => ({ ...s, flowControl: v as 'none' | 'hardware' }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="hardware">Hardware (RTS/CTS)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      case 'websocket':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>WebSocket URL</Label>
              <Input
                value={activeTab.wsSettings.url}
                onChange={(e) => setWsSettings((s) => ({ ...s, url: e.target.value }))}
                placeholder="ws://localhost:8080"
              />
            </div>
            <div className="space-y-2">
              <Label>Protocols (optional, comma-separated)</Label>
              <Input
                value={activeTab.wsSettings.protocols?.join(', ') || ''}
                onChange={(e) =>
                  setWsSettings((s) => ({
                    ...s,
                    protocols: e.target.value
                      ? e.target.value.split(',').map((p) => p.trim())
                      : undefined,
                  }))
                }
                placeholder="e.g., binary, text"
              />
            </div>
          </div>
        );
      case 'ssh':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>WebSocket Proxy URL</Label>
              <Input
                value={activeTab.sshSettings.proxyUrl}
                onChange={(e) => setSshSettings((s) => ({ ...s, proxyUrl: e.target.value }))}
                placeholder="ws://localhost:8022"
              />
              <p className="text-xs text-muted-foreground">
                SSH requires a WebSocket-to-SSH proxy server
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Host</Label>
                <Input
                  value={activeTab.sshSettings.host}
                  onChange={(e) => setSshSettings((s) => ({ ...s, host: e.target.value }))}
                  placeholder="192.168.1.1"
                />
              </div>
              <div className="space-y-2">
                <Label>Port</Label>
                <Input
                  type="number"
                  value={activeTab.sshSettings.port}
                  onChange={(e) => setSshSettings((s) => ({ ...s, port: parseInt(e.target.value) || 22 }))}
                  placeholder="22"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Username</Label>
              <Input
                value={activeTab.sshSettings.username}
                onChange={(e) => setSshSettings((s) => ({ ...s, username: e.target.value }))}
                placeholder="root"
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={sshPassword}
                onChange={(e) => setSshPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </div>
        );
      case 'telnet':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>WebSocket Proxy URL</Label>
              <Input
                value={activeTab.telnetSettings.proxyUrl}
                onChange={(e) => setTelnetSettings((s) => ({ ...s, proxyUrl: e.target.value }))}
                placeholder="ws://localhost:8023"
              />
              <p className="text-xs text-muted-foreground">
                Telnet requires a WebSocket-to-Telnet proxy server
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Host</Label>
                <Input
                  value={activeTab.telnetSettings.host}
                  onChange={(e) => setTelnetSettings((s) => ({ ...s, host: e.target.value }))}
                  placeholder="192.168.1.1"
                />
              </div>
              <div className="space-y-2">
                <Label>Port</Label>
                <Input
                  type="number"
                  value={activeTab.telnetSettings.port}
                  onChange={(e) => setTelnetSettings((s) => ({ ...s, port: parseInt(e.target.value) || 23 }))}
                  placeholder="23"
                />
              </div>
            </div>
          </div>
        );
    }
  };

  // Get connection info for toolbar
  const getConnectionInfo = () => {
    switch (activeTab.connectionType) {
      case 'serial':
        return `${activeTab.serialSettings.baudRate} baud`;
      case 'websocket':
        return activeTab.wsSettings.url;
      case 'ssh':
        return `${activeTab.sshSettings.username}@${activeTab.sshSettings.host}`;
      case 'telnet':
        return `${activeTab.telnetSettings.host}:${activeTab.telnetSettings.port}`;
    }
  };

  return (
    <div className={containerClass}>
      {/* macOS-style Title Bar */}
      <div className="flex items-center gap-2 bg-muted/80 px-3 py-2 border-b">
        {/* Traffic light buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={isFullscreen ? toggleFullscreen : undefined}
            className="h-3 w-3 rounded-full bg-[#ff5f57] hover:brightness-110 transition-all"
            aria-label="Close"
          />
          <button
            className="h-3 w-3 rounded-full bg-[#febc2e] hover:brightness-110 transition-all"
            aria-label="Minimize"
          />
          <button
            onClick={toggleFullscreen}
            className="h-3 w-3 rounded-full bg-[#28c840] hover:brightness-110 transition-all"
            aria-label="Maximize"
          />
        </div>
        {/* Title */}
        <div className="flex-1 text-center">
          <span className="text-xs font-medium text-muted-foreground">
            Web Terminal
          </span>
        </div>
        {/* Spacer to balance the traffic lights */}
        <div className="w-13" />
      </div>

      {/* Tab Bar */}
      <div className="flex items-center bg-muted/50 border-b overflow-x-auto">
        <div className="flex items-center flex-1 min-w-0">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`group flex items-center gap-1.5 px-3 py-1.5 border-r cursor-pointer text-xs transition-colors ${
                tab.id === activeTabId
                  ? 'bg-background text-foreground'
                  : 'text-muted-foreground hover:bg-background/50'
              }`}
              onClick={() => setActiveTabId(tab.id)}
            >
              <Circle
                className={`h-2 w-2 shrink-0 ${
                  tab.isConnected ? 'fill-green-500 text-green-500' : 'fill-muted-foreground/50 text-muted-foreground/50'
                }`}
              />
              <span className="truncate max-w-24">{tab.title}</span>
              {tabs.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
        {/* Add tab button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => addTab(activeTab.connectionType)}
                className="px-2 py-1.5 text-muted-foreground hover:text-foreground hover:bg-background/50 transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>New Tab</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-0.5 sm:gap-1 bg-muted/50 px-1 sm:px-2 py-1.5 border-b overflow-x-auto">
        {/* Connection status indicator */}
        <div className="flex items-center gap-1.5 px-1 sm:px-2">
          <Circle
            className={`h-2.5 w-2.5 ${activeTab.isConnected ? 'fill-green-500 text-green-500' : 'fill-muted-foreground text-muted-foreground'}`}
          />
          <span className="hidden sm:inline text-xs text-muted-foreground">
            {activeTab.isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        <div className="h-4 w-px bg-border mx-0.5 sm:mx-1" />

        {/* Connection Type Selector */}
        <Select
          value={activeTab.connectionType}
          onValueChange={(v) => setConnectionType(v as ConnectionType)}
          disabled={activeTab.isConnected}
        >
          <SelectTrigger className="h-7 w-24 sm:w-36 bg-transparent border-input text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(['serial', 'websocket', 'ssh', 'telnet'] as ConnectionType[]).map((type) => (
              <SelectItem key={type} value={type}>
                <div className="flex items-center gap-2">
                  {CONNECTION_ICONS[type]}
                  {CONNECTION_LABELS[type]}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Connection info display - hidden on mobile */}
        <span className="hidden md:inline text-xs text-muted-foreground px-2 truncate max-w-40">
          {getConnectionInfo()}
        </span>

        {/* Connect Dialog / Disconnect Button */}
        {activeTab.isConnected ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDisconnect(activeTab.id)}
                  className="h-7 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <Unplug className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Disconnect</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <Dialog open={connectionDialogOpen} onOpenChange={setConnectionDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                disabled={!isSupported || isConnecting}
                className="h-7 px-2 text-green-400 hover:text-green-300 hover:bg-green-500/10"
              >
                {CONNECTION_ICONS[activeTab.connectionType]}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {CONNECTION_ICONS[activeTab.connectionType]}
                  {CONNECTION_LABELS[activeTab.connectionType]} Connection
                </DialogTitle>
                <DialogDescription>
                  Configure your {CONNECTION_LABELS[activeTab.connectionType].toLowerCase()} connection settings
                </DialogDescription>
              </DialogHeader>
              {renderConnectionSettings()}
              <DialogFooter>
                <Button variant="outline" onClick={() => setConnectionDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleConnect} disabled={isConnecting}>
                  {isConnecting ? 'Connecting...' : 'Connect'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        <div className="h-4 w-px bg-border mx-0.5 sm:mx-1" />

        {/* Settings Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-muted-foreground hover:text-foreground"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel>Terminal</DropdownMenuLabel>
            <DropdownMenuCheckboxItem
              checked={terminalSettings.localEcho}
              onCheckedChange={(v) =>
                setTerminalSettings((s) => ({ ...s, localEcho: v }))
              }
            >
              Local Echo
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={terminalSettings.hexView}
              onCheckedChange={(v) =>
                setTerminalSettings((s) => ({ ...s, hexView: v }))
              }
            >
              Hex View
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={terminalSettings.timestamps}
              onCheckedChange={(v) =>
                setTerminalSettings((s) => ({ ...s, timestamps: v }))
              }
            >
              Timestamps
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={terminalSettings.autoScroll}
              onCheckedChange={(v) =>
                setTerminalSettings((s) => ({ ...s, autoScroll: v }))
              }
            >
              Auto-Scroll
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Line Ending</DropdownMenuLabel>
            {(['none', 'cr', 'lf', 'crlf'] as const).map((le) => (
              <DropdownMenuCheckboxItem
                key={le}
                checked={terminalSettings.lineEnding === le}
                onCheckedChange={() =>
                  setTerminalSettings((s) => ({ ...s, lineEnding: le }))
                }
              >
                {le.toUpperCase()}
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Font Size</DropdownMenuLabel>
            <div className="flex items-center justify-between px-2 py-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setFontSize((s) => Math.max(8, s - 1))}
                disabled={fontSize <= 8}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="text-sm font-mono">{fontSize}px</span>
              <Button
                variant="outline"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setFontSize((s) => Math.min(24, s + 1))}
                disabled={fontSize >= 24}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Search */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSearch}
                className={`h-7 px-2 ${showSearch ? 'text-primary' : 'text-muted-foreground'} hover:text-foreground`}
              >
                <Search className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Search (Ctrl+F)</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Clear */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => terminalRefs.current.get(activeTabId)?.clear()}
                className="h-7 px-2 text-muted-foreground hover:text-foreground"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Clear Terminal</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Export */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExportLog}
                disabled={activeTab.sessionLog.length === 0}
                className="h-7 px-2 text-muted-foreground hover:text-foreground disabled:opacity-30"
              >
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Export Log ({activeTab.sessionLog.length})</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="flex-1" />

        {/* Error indicator */}
        {error && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 text-destructive px-2">
                  <AlertTriangle className="h-4 w-4" />
                </div>
              </TooltipTrigger>
              <TooltipContent>{error}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Fullscreen */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFullscreen}
                className="h-7 px-2 text-muted-foreground hover:text-foreground"
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isFullscreen ? 'Exit Fullscreen (ESC)' : 'Fullscreen'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="flex items-center gap-1 sm:gap-2 bg-muted/50 px-2 sm:px-3 py-1.5 border-b">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.shiftKey ? handleSearchPrevious() : handleSearchNext();
              } else if (e.key === 'Escape') {
                toggleSearch();
              }
            }}
            placeholder="Search..."
            className="flex-1 min-w-0 bg-background px-2 py-1 text-sm text-foreground rounded border border-input focus:outline-none focus:border-primary"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSearchPrevious}
            disabled={!searchTerm}
            className="h-6 px-1 sm:px-1.5 text-muted-foreground hover:text-foreground shrink-0"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSearchNext}
            disabled={!searchTerm}
            className="h-6 px-1 sm:px-1.5 text-muted-foreground hover:text-foreground shrink-0"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSearch}
            className="h-6 px-1 sm:px-1.5 text-muted-foreground hover:text-foreground shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Terminal Panes - render all but only show active */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`absolute inset-0 overflow-hidden ${tab.id === activeTabId ? 'z-10' : 'z-0 invisible'}`}
          >
            <TerminalDisplay
              ref={(el) => {
                terminalRefs.current.set(tab.id, el);
                // Show welcome message when terminal is ready (only once per tab)
                if (el && !welcomeShownRef.current.has(tab.id)) {
                  welcomeShownRef.current.add(tab.id);
                  setTimeout(() => showWelcomeMessage(tab.id, tab.connectionType), 100);
                }
              }}
              onData={handleTerminalData}
              autoScroll={terminalSettings.autoScroll}
              fontSize={fontSize}
            />
          </div>
        ))}
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between border-t bg-muted/50 px-2 py-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <Circle
            className={`h-2 w-2 ${activeTab.isConnected ? 'fill-green-500 text-green-500' : 'fill-muted-foreground/50 text-muted-foreground/50'}`}
          />
          {activeTab.isConnected ? 'Connected - click terminal to type' : 'Local shell - type "help" for commands'}
        </span>
        <Badge variant="outline" className="h-5 text-[10px]">
          {terminalSettings.lineEnding.toUpperCase()}
        </Badge>
      </div>

      {/* Not supported warning (only for Serial) */}
      {activeTab.connectionType === 'serial' && !isSupported && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="text-center p-6 max-w-md">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Browser Not Supported
            </h3>
            <p className="text-muted-foreground text-sm">
              Web Serial API is not available in this browser. Please use Chrome, Edge, or Opera on desktop.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
