/**
 * Connection types supported by the terminal
 */
export type ConnectionType = 'serial' | 'websocket' | 'ssh' | 'telnet';

/**
 * Serial port connection settings
 */
export interface SerialSettings {
  baudRate: number;
  dataBits: 7 | 8;
  stopBits: 1 | 2;
  parity: 'none' | 'even' | 'odd';
  flowControl: 'none' | 'hardware';
}

/**
 * WebSocket connection settings
 */
export interface WebSocketSettings {
  url: string;
  protocols?: string[];
}

/**
 * SSH connection settings (via WebSocket proxy)
 */
export interface SSHSettings {
  proxyUrl: string; // WebSocket URL to SSH proxy (e.g., ws://localhost:8080)
  host: string;
  port: number;
  username: string;
  // Password handled separately for security
}

/**
 * Telnet connection settings (via WebSocket proxy)
 */
export interface TelnetSettings {
  proxyUrl: string; // WebSocket URL to Telnet proxy
  host: string;
  port: number;
}

/**
 * Terminal display and behavior settings
 */
export interface TerminalSettings {
  localEcho: boolean;
  lineEnding: 'none' | 'cr' | 'lf' | 'crlf';
  hexView: boolean;
  timestamps: boolean;
  autoScroll: boolean;
}

/**
 * Session log entry for transmitted/received data
 */
export interface LogEntry {
  timestamp: Date;
  direction: 'tx' | 'rx';
  data: string;
  rawBytes?: Uint8Array;
}

/**
 * Default serial settings
 */
export const DEFAULT_SERIAL_SETTINGS: SerialSettings = {
  baudRate: 115200,
  dataBits: 8,
  stopBits: 1,
  parity: 'none',
  flowControl: 'none',
};

/**
 * Default WebSocket settings
 */
export const DEFAULT_WEBSOCKET_SETTINGS: WebSocketSettings = {
  url: 'ws://localhost:8080',
};

/**
 * Default SSH settings
 */
export const DEFAULT_SSH_SETTINGS: SSHSettings = {
  proxyUrl: 'ws://localhost:8022',
  host: 'localhost',
  port: 22,
  username: 'root',
};

/**
 * Default Telnet settings
 */
export const DEFAULT_TELNET_SETTINGS: TelnetSettings = {
  proxyUrl: 'ws://localhost:8023',
  host: 'localhost',
  port: 23,
};

/**
 * Default terminal settings
 */
export const DEFAULT_TERMINAL_SETTINGS: TerminalSettings = {
  localEcho: false,
  lineEnding: 'lf',
  hexView: false,
  timestamps: false,
  autoScroll: true,
};

/**
 * Tab state for multi-terminal support
 */
export interface TabState {
  id: string;
  title: string;
  connectionType: ConnectionType;
  isConnected: boolean;
  serialSettings: SerialSettings;
  wsSettings: WebSocketSettings;
  sshSettings: SSHSettings;
  telnetSettings: TelnetSettings;
  sessionLog: LogEntry[];
}

/**
 * Create a new tab with default settings
 */
export function createDefaultTab(id: string, connectionType: ConnectionType = 'serial'): TabState {
  const typeLabels: Record<ConnectionType, string> = {
    serial: 'Serial',
    websocket: 'WebSocket',
    ssh: 'SSH',
    telnet: 'Telnet',
  };

  return {
    id,
    title: `${typeLabels[connectionType]} ${id.slice(-4)}`,
    connectionType,
    isConnected: false,
    serialSettings: { ...DEFAULT_SERIAL_SETTINGS },
    wsSettings: { ...DEFAULT_WEBSOCKET_SETTINGS },
    sshSettings: { ...DEFAULT_SSH_SETTINGS },
    telnetSettings: { ...DEFAULT_TELNET_SETTINGS },
    sessionLog: [],
  };
}
