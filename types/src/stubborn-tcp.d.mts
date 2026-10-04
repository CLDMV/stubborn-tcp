/**
 *
 *	@Project: @cldmv/stubborn-tcp
 *	@Filename: /src/stubborn-tcp.mjs
 *	@Date: 2025-10-06T17:04:41-07:00 (1759795481)
 *	@Author: Nate Corcoran <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Corcoran <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2026-10-03T11:39:09-07:00 (1791052749)
 *	-----
 *	@Copyright: Copyright (c) 2013-2026 Catalyzed Motivation Inc. All rights reserved.
 *
 */
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
 * @param {function} [options.onTimeout] - Function to call when connection timeout occurs
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
 * @param {number} [options.connectionTimeout=10000] - Connection timeout in milliseconds (0 or negative to disable)
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
declare function StubbornTCP(options?: {
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
    tls?: boolean;
    tlsOptions?: object;
}): any;
declare namespace StubbornTCP {
    var prototype: any;
}
export default StubbornTCP;
export { StubbornTCP };
