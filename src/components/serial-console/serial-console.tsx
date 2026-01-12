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
  LogEntry,
} from '@/types/serial';
import {
  DEFAULT_SERIAL_SETTINGS,
  DEFAULT_WEBSOCKET_SETTINGS,
  DEFAULT_SSH_SETTINGS,
  DEFAULT_TELNET_SETTINGS,
  DEFAULT_TERMINAL_SETTINGS,
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

export function SerialConsole() {
  // Connection type
  const [connectionType, setConnectionType] = useState<ConnectionType>('serial');

  // State
  const [isSupported, setIsSupported] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionDialogOpen, setConnectionDialogOpen] = useState(false);

  // Settings for each connection type
  const [serialSettings, setSerialSettings] = useState<SerialSettings>(
    DEFAULT_SERIAL_SETTINGS
  );
  const [wsSettings, setWsSettings] = useState<WebSocketSettings>(
    DEFAULT_WEBSOCKET_SETTINGS
  );
  const [sshSettings, setSshSettings] = useState<SSHSettings>(
    DEFAULT_SSH_SETTINGS
  );
  const [telnetSettings, setTelnetSettings] = useState<TelnetSettings>(
    DEFAULT_TELNET_SETTINGS
  );
  const [sshPassword, setSshPassword] = useState('');

  const [terminalSettings, setTerminalSettings] = useState<TerminalSettings>(
    DEFAULT_TERMINAL_SETTINGS
  );
  const [sessionLog, setSessionLog] = useState<LogEntry[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Refs
  const terminalRef = useRef<TerminalDisplayHandle>(null);
  const portRef = useRef<SerialPort | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(
    null
  );
  const writerRef = useRef<WritableStreamDefaultWriter<Uint8Array> | null>(
    null
  );
  const readLoopActiveRef = useRef(false);
  const disconnectRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const inputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Check Web Serial API support (only for serial connection type)
  useEffect(() => {
    if (connectionType === 'serial' && !isWebSerialSupported()) {
      setIsSupported(false);
      setError('Web Serial API not supported. Use Chrome, Edge, or Opera.');
    } else {
      setIsSupported(true);
      setError(null);
    }
  }, [connectionType]);

  // Add log entry
  const addLogEntry = useCallback(
    (direction: 'tx' | 'rx', data: string, rawBytes?: Uint8Array) => {
      setSessionLog((prev) => [
        ...prev,
        { timestamp: new Date(), direction, data, rawBytes },
      ]);
    },
    []
  );

  // Handle received data (shared across connection types)
  const handleReceivedData = useCallback(
    (data: string | Uint8Array) => {
      let text: string;
      let bytes: Uint8Array | undefined;

      if (data instanceof Uint8Array) {
        bytes = data;
        text = bytesToString(data);
      } else {
        text = data;
        bytes = stringToBytes(data);
      }

      if (terminalSettings.hexView && bytes) {
        terminalRef.current?.writeBytes(bytes, true);
      } else {
        if (terminalSettings.timestamps) {
          terminalRef.current?.write(
            `\x1b[90m[${formatTimestamp(new Date())}]\x1b[0m `
          );
        }
        terminalRef.current?.write(text);
      }
      addLogEntry('rx', text, bytes);
    },
    [terminalSettings.hexView, terminalSettings.timestamps, addLogEntry]
  );

  // Serial read loop
  const startSerialReadLoop = useCallback(async () => {
    if (!portRef.current?.readable || readLoopActiveRef.current) return;
    readLoopActiveRef.current = true;

    try {
      const reader = portRef.current.readable.getReader();
      readerRef.current = reader;

      while (readLoopActiveRef.current) {
        const { value, done } = await reader.read();
        if (done) break;

        if (value && value.length > 0) {
          handleReceivedData(value);
        }
      }
      reader.releaseLock();
    } catch (err) {
      if (readLoopActiveRef.current) {
        console.error('Read error:', err);
      }
    } finally {
      readerRef.current = null;
      readLoopActiveRef.current = false;
    }
  }, [handleReceivedData]);

  // Connect to Serial
  const handleSerialConnect = useCallback(async () => {
    if (!isWebSerialSupported()) return;

    try {
      const port = await navigator.serial.requestPort();
      portRef.current = port;

      await port.open({
        baudRate: serialSettings.baudRate,
        dataBits: serialSettings.dataBits,
        stopBits: serialSettings.stopBits,
        parity: serialSettings.parity,
        flowControl: serialSettings.flowControl,
      });

      if (port.writable) {
        writerRef.current = port.writable.getWriter();
      }

      setIsConnected(true);
      terminalRef.current?.writeln(
        `\x1b[32mConnected to serial port at ${serialSettings.baudRate} baud\x1b[0m`
      );
      startSerialReadLoop();

      port.addEventListener('disconnect', () => {
        disconnectRef.current();
        terminalRef.current?.writeln('\x1b[31mDevice disconnected\x1b[0m');
      });
    } catch (err) {
      if (err instanceof Error && err.name !== 'NotFoundError') {
        throw err;
      }
    }
  }, [serialSettings, startSerialReadLoop]);

  // Connect to WebSocket
  const handleWebSocketConnect = useCallback(async () => {
    return new Promise<void>((resolve, reject) => {
      try {
        const ws = new WebSocket(wsSettings.url, wsSettings.protocols);
        wsRef.current = ws;

        ws.binaryType = 'arraybuffer';

        ws.onopen = () => {
          setIsConnected(true);
          terminalRef.current?.writeln(
            `\x1b[32mConnected to WebSocket: ${wsSettings.url}\x1b[0m`
          );
          resolve();
        };

        ws.onmessage = (event) => {
          if (event.data instanceof ArrayBuffer) {
            handleReceivedData(new Uint8Array(event.data));
          } else {
            handleReceivedData(event.data);
          }
        };

        ws.onerror = (event) => {
          console.error('WebSocket error:', event);
          reject(new Error('WebSocket connection failed'));
        };

        ws.onclose = (event) => {
          setIsConnected(false);
          wsRef.current = null;
          terminalRef.current?.writeln(
            `\x1b[33mWebSocket disconnected${event.reason ? `: ${event.reason}` : ''}\x1b[0m`
          );
        };
      } catch (err) {
        reject(err);
      }
    });
  }, [wsSettings, handleReceivedData]);

  // Connect to SSH via WebSocket proxy
  const handleSSHConnect = useCallback(async () => {
    return new Promise<void>((resolve, reject) => {
      try {
        const ws = new WebSocket(sshSettings.proxyUrl);
        wsRef.current = ws;

        ws.binaryType = 'arraybuffer';

        ws.onopen = () => {
          // Send SSH connection parameters to proxy
          ws.send(JSON.stringify({
            type: 'connect',
            host: sshSettings.host,
            port: sshSettings.port,
            username: sshSettings.username,
            password: sshPassword,
          }));
        };

        ws.onmessage = (event) => {
          // Handle messages from proxy
          if (typeof event.data === 'string') {
            try {
              const msg = JSON.parse(event.data);
              if (msg.type === 'connected') {
                setIsConnected(true);
                terminalRef.current?.writeln(
                  `\x1b[32mConnected to SSH: ${sshSettings.username}@${sshSettings.host}:${sshSettings.port}\x1b[0m`
                );
                resolve();
              } else if (msg.type === 'error') {
                reject(new Error(msg.message || 'SSH connection failed'));
              } else if (msg.type === 'data') {
                handleReceivedData(msg.data);
              }
            } catch {
              // Not JSON, treat as terminal data
              handleReceivedData(event.data);
            }
          } else if (event.data instanceof ArrayBuffer) {
            handleReceivedData(new Uint8Array(event.data));
          }
        };

        ws.onerror = () => {
          reject(new Error('SSH proxy connection failed'));
        };

        ws.onclose = (event) => {
          setIsConnected(false);
          wsRef.current = null;
          terminalRef.current?.writeln(
            `\x1b[33mSSH disconnected${event.reason ? `: ${event.reason}` : ''}\x1b[0m`
          );
        };
      } catch (err) {
        reject(err);
      }
    });
  }, [sshSettings, sshPassword, handleReceivedData]);

  // Connect to Telnet via WebSocket proxy
  const handleTelnetConnect = useCallback(async () => {
    return new Promise<void>((resolve, reject) => {
      try {
        const ws = new WebSocket(telnetSettings.proxyUrl);
        wsRef.current = ws;

        ws.binaryType = 'arraybuffer';

        ws.onopen = () => {
          // Send Telnet connection parameters to proxy
          ws.send(JSON.stringify({
            type: 'connect',
            host: telnetSettings.host,
            port: telnetSettings.port,
          }));
        };

        ws.onmessage = (event) => {
          if (typeof event.data === 'string') {
            try {
              const msg = JSON.parse(event.data);
              if (msg.type === 'connected') {
                setIsConnected(true);
                terminalRef.current?.writeln(
                  `\x1b[32mConnected to Telnet: ${telnetSettings.host}:${telnetSettings.port}\x1b[0m`
                );
                resolve();
              } else if (msg.type === 'error') {
                reject(new Error(msg.message || 'Telnet connection failed'));
              } else if (msg.type === 'data') {
                handleReceivedData(msg.data);
              }
            } catch {
              handleReceivedData(event.data);
            }
          } else if (event.data instanceof ArrayBuffer) {
            handleReceivedData(new Uint8Array(event.data));
          }
        };

        ws.onerror = () => {
          reject(new Error('Telnet proxy connection failed'));
        };

        ws.onclose = (event) => {
          setIsConnected(false);
          wsRef.current = null;
          terminalRef.current?.writeln(
            `\x1b[33mTelnet disconnected${event.reason ? `: ${event.reason}` : ''}\x1b[0m`
          );
        };
      } catch (err) {
        reject(err);
      }
    });
  }, [telnetSettings, handleReceivedData]);

  // Main connect handler
  const handleConnect = useCallback(async () => {
    if (!isSupported) return;
    setError(null);
    setIsConnecting(true);
    setConnectionDialogOpen(false);

    try {
      switch (connectionType) {
        case 'serial':
          await handleSerialConnect();
          break;
        case 'websocket':
          await handleWebSocketConnect();
          break;
        case 'ssh':
          await handleSSHConnect();
          break;
        case 'telnet':
          await handleTelnetConnect();
          break;
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
        terminalRef.current?.writeln(`\x1b[31mError: ${err.message}\x1b[0m`);
      }
    } finally {
      setIsConnecting(false);
    }
  }, [isSupported, connectionType, handleSerialConnect, handleWebSocketConnect, handleSSHConnect, handleTelnetConnect]);

  // Disconnect
  const handleDisconnect = useCallback(async () => {
    readLoopActiveRef.current = false;

    try {
      // Close WebSocket if open
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      // Close serial port if open - capture refs to avoid race conditions
      const reader = readerRef.current;
      const writer = writerRef.current;
      const port = portRef.current;

      readerRef.current = null;
      writerRef.current = null;
      portRef.current = null;

      if (reader) {
        try {
          await reader.cancel();
          reader.releaseLock();
        } catch {
          // Ignore errors if already released
        }
      }
      if (writer) {
        try {
          await writer.close();
        } catch {
          // Ignore errors if already closed
        }
      }
      if (port) {
        try {
          await port.close();
        } catch {
          // Ignore errors if already closed
        }
      }
    } catch (err) {
      console.error('Disconnect error:', err);
    }
    setIsConnected(false);
    terminalRef.current?.writeln('\x1b[33mDisconnected\x1b[0m');
  }, []);

  useEffect(() => {
    disconnectRef.current = handleDisconnect;
  }, [handleDisconnect]);

  // Send data
  const handleSend = useCallback(
    async (data: string) => {
      if (!data) return;

      const lineEndings: Record<string, string> = {
        none: '',
        cr: '\r',
        lf: '\n',
        crlf: '\r\n',
      };
      const dataToSend = data + lineEndings[terminalSettings.lineEnding];
      const bytes = stringToBytes(dataToSend);

      try {
        if (connectionType === 'serial' && writerRef.current) {
          await writerRef.current.write(bytes);
        } else if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          // For SSH/Telnet proxies, send as JSON command
          if (connectionType === 'ssh' || connectionType === 'telnet') {
            wsRef.current.send(JSON.stringify({ type: 'data', data: dataToSend }));
          } else {
            wsRef.current.send(dataToSend);
          }
        } else {
          return;
        }

        if (terminalSettings.localEcho) {
          if (terminalSettings.hexView) {
            terminalRef.current?.writeBytes(bytes, true);
          } else {
            terminalRef.current?.write(`\x1b[36m${dataToSend}\x1b[0m`);
          }
        }
        addLogEntry('tx', dataToSend, bytes);
      } catch (err) {
        console.error('Send error:', err);
      }
    },
    [connectionType, terminalSettings, addLogEntry]
  );

  // Terminal keyboard input
  const handleTerminalData = useCallback(
    (data: string) => {
      if (!isConnected) return;
      handleSend(data);
    },
    [isConnected, handleSend]
  );

  // Input submit
  const handleInputSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (inputValue && isConnected) {
        handleSend(inputValue);
        setInputValue('');
      }
    },
    [inputValue, isConnected, handleSend]
  );

  // Export log
  const handleExportLog = useCallback(() => {
    if (sessionLog.length === 0) return;
    const content = sessionLog
      .map((e) => `[${e.timestamp.toISOString()}] [${e.direction.toUpperCase()}] ${e.data}`)
      .join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `terminal-${connectionType}-${new Date().toISOString().split('T')[0]}.log`;
    a.click();
    URL.revokeObjectURL(url);
  }, [sessionLog, connectionType]);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  // Search handlers
  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    if (term) {
      terminalRef.current?.search(term);
    } else {
      terminalRef.current?.clearSearch();
    }
  }, []);

  const handleSearchNext = useCallback(() => {
    if (searchTerm) {
      terminalRef.current?.search(searchTerm);
    }
  }, [searchTerm]);

  const handleSearchPrevious = useCallback(() => {
    if (searchTerm) {
      terminalRef.current?.searchPrevious();
    }
  }, [searchTerm]);

  const toggleSearch = useCallback(() => {
    setShowSearch((prev) => {
      if (!prev) {
        setTimeout(() => searchInputRef.current?.focus(), 0);
      } else {
        terminalRef.current?.clearSearch();
        setSearchTerm('');
      }
      return !prev;
    });
  }, []);

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
      // Ctrl+F to open search
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

  // Focus input when connected
  useEffect(() => {
    if (isConnected) {
      inputRef.current?.focus();
    }
  }, [isConnected]);

  const containerClass = isFullscreen
    ? 'fixed inset-0 z-50 flex flex-col bg-[#0d1117]'
    : 'flex flex-col h-[450px] sm:h-[600px] rounded-lg overflow-hidden border border-slate-700 bg-[#0d1117]';

  // Render connection settings dialog content
  const renderConnectionSettings = () => {
    switch (connectionType) {
      case 'serial':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Baud Rate</Label>
                <Select
                  value={serialSettings.baudRate.toString()}
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
                  value={serialSettings.dataBits.toString()}
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
                  value={serialSettings.stopBits.toString()}
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
                  value={serialSettings.parity}
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
                value={serialSettings.flowControl}
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
                value={wsSettings.url}
                onChange={(e) => setWsSettings((s) => ({ ...s, url: e.target.value }))}
                placeholder="ws://localhost:8080"
              />
            </div>
            <div className="space-y-2">
              <Label>Protocols (optional, comma-separated)</Label>
              <Input
                value={wsSettings.protocols?.join(', ') || ''}
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
                value={sshSettings.proxyUrl}
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
                  value={sshSettings.host}
                  onChange={(e) => setSshSettings((s) => ({ ...s, host: e.target.value }))}
                  placeholder="192.168.1.1"
                />
              </div>
              <div className="space-y-2">
                <Label>Port</Label>
                <Input
                  type="number"
                  value={sshSettings.port}
                  onChange={(e) => setSshSettings((s) => ({ ...s, port: parseInt(e.target.value) || 22 }))}
                  placeholder="22"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Username</Label>
              <Input
                value={sshSettings.username}
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
                value={telnetSettings.proxyUrl}
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
                  value={telnetSettings.host}
                  onChange={(e) => setTelnetSettings((s) => ({ ...s, host: e.target.value }))}
                  placeholder="192.168.1.1"
                />
              </div>
              <div className="space-y-2">
                <Label>Port</Label>
                <Input
                  type="number"
                  value={telnetSettings.port}
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
    switch (connectionType) {
      case 'serial':
        return `${serialSettings.baudRate} baud`;
      case 'websocket':
        return wsSettings.url;
      case 'ssh':
        return `${sshSettings.username}@${sshSettings.host}`;
      case 'telnet':
        return `${telnetSettings.host}:${telnetSettings.port}`;
    }
  };

  return (
    <div className={containerClass}>
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 sm:gap-1 bg-[#161b22] px-1 sm:px-2 py-1.5 border-b border-slate-700 overflow-x-auto">
        {/* Connection status indicator */}
        <div className="flex items-center gap-1.5 px-1 sm:px-2">
          <Circle
            className={`h-2.5 w-2.5 ${isConnected ? 'fill-green-500 text-green-500' : 'fill-slate-500 text-slate-500'}`}
          />
          <span className="hidden sm:inline text-xs text-slate-400">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        <div className="h-4 w-px bg-slate-700 mx-0.5 sm:mx-1" />

        {/* Connection Type Selector */}
        <Select
          value={connectionType}
          onValueChange={(v) => setConnectionType(v as ConnectionType)}
          disabled={isConnected}
        >
          <SelectTrigger className="h-7 w-24 sm:w-36 bg-transparent border-slate-600 text-xs">
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
        <span className="hidden md:inline text-xs text-slate-500 px-2 truncate max-w-40">
          {getConnectionInfo()}
        </span>

        {/* Connect Dialog / Disconnect Button */}
        {isConnected ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDisconnect}
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
                {CONNECTION_ICONS[connectionType]}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {CONNECTION_ICONS[connectionType]}
                  {CONNECTION_LABELS[connectionType]} Connection
                </DialogTitle>
                <DialogDescription>
                  Configure your {CONNECTION_LABELS[connectionType].toLowerCase()} connection settings
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

        <div className="h-4 w-px bg-slate-700 mx-0.5 sm:mx-1" />

        {/* Settings Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-slate-400 hover:text-slate-200"
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
                className={`h-7 px-2 ${showSearch ? 'text-blue-400' : 'text-slate-400'} hover:text-slate-200`}
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
                onClick={() => terminalRef.current?.clear()}
                className="h-7 px-2 text-slate-400 hover:text-slate-200"
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
                disabled={sessionLog.length === 0}
                className="h-7 px-2 text-slate-400 hover:text-slate-200 disabled:opacity-30"
              >
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Export Log ({sessionLog.length})</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="flex-1" />

        {/* Error indicator */}
        {error && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 text-red-400 px-2">
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
                className="h-7 px-2 text-slate-400 hover:text-slate-200"
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
        <div className="flex items-center gap-1 sm:gap-2 bg-[#161b22] px-2 sm:px-3 py-1.5 border-b border-slate-700">
          <Search className="h-4 w-4 text-slate-500 shrink-0" />
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
            className="flex-1 min-w-0 bg-slate-800 px-2 py-1 text-sm text-slate-200 rounded border border-slate-600 focus:outline-none focus:border-blue-500"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSearchPrevious}
            disabled={!searchTerm}
            className="h-6 px-1 sm:px-1.5 text-slate-400 hover:text-slate-200 shrink-0"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSearchNext}
            disabled={!searchTerm}
            className="h-6 px-1 sm:px-1.5 text-slate-400 hover:text-slate-200 shrink-0"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSearch}
            className="h-6 px-1 sm:px-1.5 text-slate-400 hover:text-slate-200 shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Terminal */}
      <div className="flex-1 min-h-0">
        <TerminalDisplay
          ref={terminalRef}
          onData={handleTerminalData}
          autoScroll={terminalSettings.autoScroll}
        />
      </div>

      {/* Input Bar */}
      <form onSubmit={handleInputSubmit} className="flex border-t border-slate-700 bg-[#161b22]">
        <div className="flex items-center px-1.5 sm:px-2 text-slate-500 text-sm font-mono">
          {'>'}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={!isConnected}
          placeholder={isConnected ? 'Type command...' : 'Connect to send'}
          className="flex-1 min-w-0 bg-transparent px-1 sm:px-2 py-2 text-sm font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none disabled:opacity-50"
        />
        <div className="hidden sm:flex items-center gap-1 px-2 text-xs text-slate-600">
          <Badge variant="outline" className="h-5 text-[10px] border-slate-700">
            {terminalSettings.lineEnding.toUpperCase()}
          </Badge>
        </div>
      </form>

      {/* Not supported warning (only for Serial) */}
      {connectionType === 'serial' && !isSupported && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="text-center p-6 max-w-md">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              Browser Not Supported
            </h3>
            <p className="text-slate-400 text-sm">
              Web Serial API is not available in this browser. Please use Chrome, Edge, or Opera on desktop.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
