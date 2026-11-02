/**
 * Stubborn TCP Client - Auto-reconnecting TCP socket wrapper
 *
 * A TCP client that stubbornly keeps trying to reconnect when connections fail.
 * Provides a simple API for reliable TCP communication with automatic reconnection.
 * Extends EventEmitter to support both callback and event-based patterns.
 *
 * @class StubbornTCP
 * @extends EventEmitter
 * @param {object} options - Configuration options
 * @param {function} [options.rxFunc] - Function to call when data is received (legacy callback support)
 * @param {function} [options.onConnect] - Function to call when connection is established
 * @param {function} [options.onDisconnect] - Function to call when connection is closed
 * @param {function} [options.onError] - Function to call when an error occurs
 * @param {function} [options.onTimeout] - Function to call when a connect-phase or idle timeout occurs
 * @param {function|function[]} [options.heartbeatFunc] - Function(s) to call for heartbeat
 * @param {number} [options.heartbeatInterval=30000] - Heartbeat interval in milliseconds
 * @param {boolean} [options.heartbeatResetOnActivity=true] - Reset heartbeat timer on activity
 * @param {boolean} [options.heartbeatEnabled=false] - Enable heartbeat on initialization
 * @param {string} [options.host] - Host to connect to
 * @param {number} [options.port] - Port to connect to
 * @param {any} [options.instance] - Optional instance identifier
 * @param {number} [options.bufferSize] - Optional buffer size (ignored)
 * @param {boolean} [options.debug=false] - Enable debug logging
 * @param {boolean} [options.autoReconnect=true] - Enable automatic reconnection
 * @param {number} [options.reconnectDelay=1000] - Initial reconnect delay in milliseconds
 * @param {number} [options.maxReconnectDelay=30000] - Maximum reconnect delay in milliseconds
 * @param {number} [options.reconnectBackoffFactor=1.5] - Backoff multiplier for reconnect delay
 * @param {number} [options.maxReconnectAttempts=-1] - Maximum reconnect attempts (-1 = infinite)
 * @param {boolean} [options.keepAlive=true] - Enable TCP keep-alive
 * @param {number} [options.keepAliveInitialDelay=60000] - Initial delay for keep-alive probes in milliseconds
 * @param {boolean} [options.noDelay=true] - Disable Nagle's algorithm for low-latency
 * @param {number} [options.connectionTimeout=10000] - Connect-phase timeout in milliseconds (0 or negative to disable). Armed when a connection attempt starts and cleared once it connects (after the TLS handshake for TLS), so it never times out an established connection
 * @param {number} [options.idleTimeout=0] - Idle timeout in milliseconds for an established connection (0 or negative to disable, the default). When set, a connection with no socket activity for this long is timed out and closed
 * @param {boolean} [options.tls=false] - Enable TLS/SSL encryption
 * @param {object} [options.tlsOptions={}] - TLS/SSL configuration options
 *
 * @fires StubbornTCP#connect - Emitted when connection is established (handle, instance)
 * @fires StubbornTCP#data - Emitted when data is received (data, handle, instance)
 * @fires StubbornTCP#disconnect - Emitted when connection is closed (handle, instance)
 * @fires StubbornTCP#error - Emitted when an error occurs (error, handle, instance); only emitted while an `error` listener is attached
 * @fires StubbornTCP#failToConnect - Emitted once per connection attempt (first or reconnect) that fails before `connect` (error, handle, instance)
 * @fires StubbornTCP#maxReconnectAttemptsReached - Emitted when max reconnect attempts reached (attempts)
 * @fires StubbornTCP#heartbeat - Emitted when heartbeat is sent (handle, instance)
 * @fires StubbornTCP#heartbeatFailed - Emitted when heartbeat function fails (error, functionIndex, handle, instance)
 * @fires StubbornTCP#secureConnect - Emitted when TLS secure connection is established (handle, instance)
 * @fires StubbornTCP#keylog - Emitted when TLS key material is generated or received (line, handle, instance)
 * @fires StubbornTCP#OCSPResponse - Emitted when OCSP response is received (response, handle, instance)
 * @fires StubbornTCP#debug - Emitted for debug logging when debug mode is enabled (message, handle, instance)
 *
 * @example
 * // ESM import with callbacks (can be called with or without 'new')
 * import StubbornTCP from '@cldmv/stubborn-tcp';
 * const client = StubbornTCP({
 *   rxFunc: onData,
 *   onConnect: onConnected,
 *   onDisconnect: onDisconnected,
 *   onError: onError,
 *   host: 'localhost',
 *   port: 8080,
 *   debug: true
 * });
 *
 * @example
 * // ESM import with event listeners, custom reconnect settings, and heartbeat
 * import StubbornTCP from '@cldmv/stubborn-tcp';
 * const client = new StubbornTCP({
 *   host: 'localhost',
 *   port: 8080,
 *   reconnectDelay: 2000,
 *   maxReconnectDelay: 30000,
 *   reconnectBackoffFactor: 2.0,
 *   maxReconnectAttempts: 10,
 *   heartbeatEnabled: true,
 *   heartbeatInterval: 15000,
 *   heartbeatFunc: [(client) => client.write('PING'), (client) => client.write('KEEPALIVE')]
 * });
 * client.on('data', (data) => console.log('Received:', data));
 * client.on('connect', () => console.log('Connected!'));
 * client.on('disconnect', () => console.log('Disconnected!'));
 * client.on('error', (err) => console.log('Error:', err));
 * client.on('maxReconnectAttemptsReached', (attempts) => console.log(`Gave up after ${attempts} attempts`));
 * // Listen for debug messages when debug mode is enabled
 * client.on('debug', (message) => console.log('DEBUG:', message));
 *
 * @example
 * // CommonJS require with mixed callback and direct assignment
 * const StubbornTCP = require('@cldmv/stubborn-tcp');
 * const client = StubbornTCP({
 *   rxFunc: onData,
 *   onConnect: onConnected,
 *   host: 'localhost',
 *   port: 8080
 * });
 * // Can also set callbacks directly after initialization
 * client.OnDisconnectFunc = onDisconnected;
 * // Enable heartbeat with options object
 * client.enableHeartbeat({
 *   interval: 20000,
 *   functions: [sendPing, sendKeepAlive],
 *   resetOnActivity: false
 * });
 *
 * @example
 * // TLS/SSL connection with custom socket options
 * import StubbornTCP from '@cldmv/stubborn-tcp';
 * const secureClient = new StubbornTCP({
 *   host: 'secure.example.com',
 *   port: 443,
 *   tls: true,
 *   tlsOptions: {
 *     rejectUnauthorized: true,
 *     servername: 'secure.example.com'
 *   },
 *   keepAlive: true,
 *   keepAliveInitialDelay: 30000,
 *   noDelay: true,
 *   connectionTimeout: 5000
 * });
 * secureClient.on('secureConnect', () => console.log('TLS connection established'));
 * secureClient.on('connect', () => {
 *   console.log('Certificate info:', secureClient.getPeerCertificate());
 *   console.log('Cipher info:', secureClient.getCipher());
 * });
 */
export function StubbornTCP(options?: {
    rxFunc?: Function;
    onConnect?: Function;
    onDisconnect?: Function;
    onError?: Function;
    onTimeout?: Function;
    heartbeatFunc?: Function | Function[];
    heartbeatInterval?: number;
    heartbeatResetOnActivity?: boolean;
    heartbeatEnabled?: boolean;
    host?: string;
    port?: number;
    instance?: any;
    bufferSize?: number;
    debug?: boolean;
    autoReconnect?: boolean;
    reconnectDelay?: number;
    maxReconnectDelay?: number;
    reconnectBackoffFactor?: number;
    maxReconnectAttempts?: number;
    keepAlive?: boolean;
    keepAliveInitialDelay?: number;
    noDelay?: boolean;
    connectionTimeout?: number;
    idleTimeout?: number;
    tls?: boolean;
    tlsOptions?: object;
}): any;
export class StubbornTCP {
    /**
     * Stubborn TCP Client - Auto-reconnecting TCP socket wrapper
     *
     * A TCP client that stubbornly keeps trying to reconnect when connections fail.
     * Provides a simple API for reliable TCP communication with automatic reconnection.
     * Extends EventEmitter to support both callback and event-based patterns.
     *
     * @class StubbornTCP
     * @extends EventEmitter
     * @param {object} options - Configuration options
     * @param {function} [options.rxFunc] - Function to call when data is received (legacy callback support)
     * @param {function} [options.onConnect] - Function to call when connection is established
     * @param {function} [options.onDisconnect] - Function to call when connection is closed
     * @param {function} [options.onError] - Function to call when an error occurs
     * @param {function} [options.onTimeout] - Function to call when a connect-phase or idle timeout occurs
     * @param {function|function[]} [options.heartbeatFunc] - Function(s) to call for heartbeat
     * @param {number} [options.heartbeatInterval=30000] - Heartbeat interval in milliseconds
     * @param {boolean} [options.heartbeatResetOnActivity=true] - Reset heartbeat timer on activity
     * @param {boolean} [options.heartbeatEnabled=false] - Enable heartbeat on initialization
     * @param {string} [options.host] - Host to connect to
     * @param {number} [options.port] - Port to connect to
     * @param {any} [options.instance] - Optional instance identifier
     * @param {number} [options.bufferSize] - Optional buffer size (ignored)
     * @param {boolean} [options.debug=false] - Enable debug logging
     * @param {boolean} [options.autoReconnect=true] - Enable automatic reconnection
     * @param {number} [options.reconnectDelay=1000] - Initial reconnect delay in milliseconds
     * @param {number} [options.maxReconnectDelay=30000] - Maximum reconnect delay in milliseconds
     * @param {number} [options.reconnectBackoffFactor=1.5] - Backoff multiplier for reconnect delay
     * @param {number} [options.maxReconnectAttempts=-1] - Maximum reconnect attempts (-1 = infinite)
     * @param {boolean} [options.keepAlive=true] - Enable TCP keep-alive
     * @param {number} [options.keepAliveInitialDelay=60000] - Initial delay for keep-alive probes in milliseconds
     * @param {boolean} [options.noDelay=true] - Disable Nagle's algorithm for low-latency
     * @param {number} [options.connectionTimeout=10000] - Connect-phase timeout in milliseconds (0 or negative to disable). Armed when a connection attempt starts and cleared once it connects (after the TLS handshake for TLS), so it never times out an established connection
     * @param {number} [options.idleTimeout=0] - Idle timeout in milliseconds for an established connection (0 or negative to disable, the default). When set, a connection with no socket activity for this long is timed out and closed
     * @param {boolean} [options.tls=false] - Enable TLS/SSL encryption
     * @param {object} [options.tlsOptions={}] - TLS/SSL configuration options
     *
     * @fires StubbornTCP#connect - Emitted when connection is established (handle, instance)
     * @fires StubbornTCP#data - Emitted when data is received (data, handle, instance)
     * @fires StubbornTCP#disconnect - Emitted when connection is closed (handle, instance)
     * @fires StubbornTCP#error - Emitted when an error occurs (error, handle, instance); only emitted while an `error` listener is attached
     * @fires StubbornTCP#failToConnect - Emitted once per connection attempt (first or reconnect) that fails before `connect` (error, handle, instance)
     * @fires StubbornTCP#maxReconnectAttemptsReached - Emitted when max reconnect attempts reached (attempts)
     * @fires StubbornTCP#heartbeat - Emitted when heartbeat is sent (handle, instance)
     * @fires StubbornTCP#heartbeatFailed - Emitted when heartbeat function fails (error, functionIndex, handle, instance)
     * @fires StubbornTCP#secureConnect - Emitted when TLS secure connection is established (handle, instance)
     * @fires StubbornTCP#keylog - Emitted when TLS key material is generated or received (line, handle, instance)
     * @fires StubbornTCP#OCSPResponse - Emitted when OCSP response is received (response, handle, instance)
     * @fires StubbornTCP#debug - Emitted for debug logging when debug mode is enabled (message, handle, instance)
     *
     * @example
     * // ESM import with callbacks (can be called with or without 'new')
     * import StubbornTCP from '@cldmv/stubborn-tcp';
     * const client = StubbornTCP({
     *   rxFunc: onData,
     *   onConnect: onConnected,
     *   onDisconnect: onDisconnected,
     *   onError: onError,
     *   host: 'localhost',
     *   port: 8080,
     *   debug: true
     * });
     *
     * @example
     * // ESM import with event listeners, custom reconnect settings, and heartbeat
     * import StubbornTCP from '@cldmv/stubborn-tcp';
     * const client = new StubbornTCP({
     *   host: 'localhost',
     *   port: 8080,
     *   reconnectDelay: 2000,
     *   maxReconnectDelay: 30000,
     *   reconnectBackoffFactor: 2.0,
     *   maxReconnectAttempts: 10,
     *   heartbeatEnabled: true,
     *   heartbeatInterval: 15000,
     *   heartbeatFunc: [(client) => client.write('PING'), (client) => client.write('KEEPALIVE')]
     * });
     * client.on('data', (data) => console.log('Received:', data));
     * client.on('connect', () => console.log('Connected!'));
     * client.on('disconnect', () => console.log('Disconnected!'));
     * client.on('error', (err) => console.log('Error:', err));
     * client.on('maxReconnectAttemptsReached', (attempts) => console.log(`Gave up after ${attempts} attempts`));
     * // Listen for debug messages when debug mode is enabled
     * client.on('debug', (message) => console.log('DEBUG:', message));
     *
     * @example
     * // CommonJS require with mixed callback and direct assignment
     * const StubbornTCP = require('@cldmv/stubborn-tcp');
     * const client = StubbornTCP({
     *   rxFunc: onData,
     *   onConnect: onConnected,
     *   host: 'localhost',
     *   port: 8080
     * });
     * // Can also set callbacks directly after initialization
     * client.OnDisconnectFunc = onDisconnected;
     * // Enable heartbeat with options object
     * client.enableHeartbeat({
     *   interval: 20000,
     *   functions: [sendPing, sendKeepAlive],
     *   resetOnActivity: false
     * });
     *
     * @example
     * // TLS/SSL connection with custom socket options
     * import StubbornTCP from '@cldmv/stubborn-tcp';
     * const secureClient = new StubbornTCP({
     *   host: 'secure.example.com',
     *   port: 443,
     *   tls: true,
     *   tlsOptions: {
     *     rejectUnauthorized: true,
     *     servername: 'secure.example.com'
     *   },
     *   keepAlive: true,
     *   keepAliveInitialDelay: 30000,
     *   noDelay: true,
     *   connectionTimeout: 5000
     * });
     * secureClient.on('secureConnect', () => console.log('TLS connection established'));
     * secureClient.on('connect', () => {
     *   console.log('Certificate info:', secureClient.getPeerCertificate());
     *   console.log('Cipher info:', secureClient.getCipher());
     * });
     */
    constructor(options?: {
        rxFunc?: Function;
        onConnect?: Function;
        onDisconnect?: Function;
        onError?: Function;
        onTimeout?: Function;
        heartbeatFunc?: Function | Function[];
        heartbeatInterval?: number;
        heartbeatResetOnActivity?: boolean;
        heartbeatEnabled?: boolean;
        host?: string;
        port?: number;
        instance?: any;
        bufferSize?: number;
        debug?: boolean;
        autoReconnect?: boolean;
        reconnectDelay?: number;
        maxReconnectDelay?: number;
        reconnectBackoffFactor?: number;
        maxReconnectAttempts?: number;
        keepAlive?: boolean;
        keepAliveInitialDelay?: number;
        noDelay?: boolean;
        connectionTimeout?: number;
        idleTimeout?: number;
        tls?: boolean;
        tlsOptions?: object;
    });
    _connectState: number;
    _openState: number;
    onConnectFunc: any;
    onDisconnectFunc: any;
    instance: any;
    settings: {
        debug: boolean;
        autoReconnect: {
            enabled: boolean;
            delay: number;
            currentDelay: number;
            maxDelay: number;
            backoffFactor: number;
            maxAttempts: number;
            attempts: number;
            isReconnecting: boolean;
            timer: any;
        };
        connection: {
            host: string;
            port: number;
            timeout: number;
            idleTimeout: number;
        };
        socket: {
            keepAlive: boolean;
            keepAliveInitialDelay: number;
            noDelay: boolean;
        };
        tls: {
            enabled: boolean;
            options: any;
        };
        heartbeat: {
            interval: number;
            resetOnActivity: boolean;
            enabled: boolean;
            timer: any;
            functions: any[];
            currentFunctionIndex: number;
        };
    };
    functions: {
        rxFunc: any;
        onError: any;
        onTimeout: any;
    };
    handle: number;
    Handle: number;
    lCPrefix: string;
    /**
     * Set delay between transmitted messages (not implemented)
     * @param {number} ms - Milliseconds to delay
     */
    setTxInterMsgDelay: (ms: number) => void;
    SetTxInterMsgDelay: (ms: number) => void;
    /**
     * Add RX framing (not implemented)
     */
    addRxFraming: () => void;
    AddRxFraming: () => void;
    /**
     * Add HTTP RX framing (not implemented)
     */
    addRxHTTPFraming: () => void;
    AddRxHTTPFraming: () => void;
    /**
     * Enable heartbeat functionality
     * @param {object} [options={}] - Heartbeat configuration options
     * @param {number} [options.interval] - Heartbeat interval in milliseconds
     * @param {function|function[]} [options.functions] - Function(s) to call for heartbeat
     * @param {boolean} [options.resetOnActivity] - Reset timer on activity
     */
    enableHeartbeat: (options?: {
        interval?: number;
        functions?: Function | Function[];
        resetOnActivity?: boolean;
    }) => void;
    EnableHeartbeat: (options?: {
        interval?: number;
        functions?: Function | Function[];
        resetOnActivity?: boolean;
    }) => void;
    /**
     * Disable heartbeat functionality
     */
    disableHeartbeat: () => void;
    /**
     * Add heartbeat function(s)
     * @param {function|function[]} functions - Function(s) to add
     */
    addHeartbeatFunction: (functions: Function | Function[]) => void;
    /**
     * Clear all heartbeat functions
     */
    clearHeartbeatFunctions: () => void;
    /**
     * Configure socket keep-alive settings
     * @param {boolean} enable - Enable keep-alive
     * @param {number} [initialDelay] - Initial delay in milliseconds
     */
    setKeepAlive: (enable: boolean, initialDelay?: number) => void;
    /**
     * Configure Nagle's algorithm (TCP_NODELAY)
     * @param {boolean} noDelay - True to disable Nagle's algorithm for low latency
     */
    setNoDelay: (noDelay: boolean) => void;
    /**
     * Set the connect-phase timeout (`connectionTimeout`). It bounds how long a connection
     * attempt may take and never applies to an established connection: on a pending attempt
     * the timer is re-armed, otherwise the value is recorded for the next attempt.
     * @param {number} timeout - Timeout in milliseconds (0 or negative to disable)
     */
    setTimeout: (timeout: number) => void;
    /**
     * Set the idle timeout (`idleTimeout`) for an established connection. Applied to the live
     * connection if there is one, and to every connection established afterwards.
     * @param {number} timeout - Timeout in milliseconds (0 or negative to disable)
     */
    setIdleTimeout: (timeout: number) => void;
    /**
     * Get TLS certificate information (only available for TLS connections)
     * @returns {object|null} Certificate information or null if not TLS
     */
    getPeerCertificate: () => object | null;
    /**
     * Get TLS cipher information (only available for TLS connections)
     * @returns {object|null} Cipher information or null if not TLS
     */
    getCipher: () => object | null;
    /**
     * Check if connection is authorized (only for TLS connections)
     * @returns {boolean} True if authorized, false otherwise
     */
    isAuthorized: () => boolean;
    /**
     * Get authorization error (only for TLS connections)
     * @returns {Error|null} Authorization error or null if authorized
     */
    getAuthorizationError: () => Error | null;
    /**
     * Write data to the TCP socket
     * @param {string|Buffer} data - Data to send
     * @returns {boolean} True if data was written successfully
     */
    write: (data: string | Buffer) => boolean;
    Write: (data: string | Buffer) => boolean;
    /**
     * Reset reconnection state (attempts and delay)
     */
    resetReconnectState: () => void;
    ResetReconnectState: () => void;
    /**
     * Close the TCP connection and disable auto-reconnect
     */
    close: () => void;
    Close: () => void;
    /**
     * Open a TCP connection to the specified host and port. Calling it on a connected (or
     * reconnecting) client replaces that connection without a `disconnect` event and keeps
     * the auto-reconnect and heartbeat settings.
     * @param {string} host - Host to connect to
     * @param {number} port - Port to connect to
     * @param {any} [instance] - Optional instance identifier (ignored)
     * @param {number} [bufferSizeArg] - Optional buffer size (ignored)
     * @returns {object} This TCP instance
     * @throws {TypeError} `ERR_MISSING_ARGS` when no port is given and none is configured. Omitted
     * `host` / `port` fall back to the last ones used, which start out as the constructor options.
     */
    open: (host: string, port: number, instance?: any, bufferSizeArg?: number) => object;
    Open: (host: string, port: number, instance?: any, bufferSizeArg?: number) => object;
}
export { StubbornTCP as default };
