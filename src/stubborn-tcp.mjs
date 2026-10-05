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

import net from "net";
import nodeTls from "tls";
import { EventEmitter } from "events";

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
function StubbornTCP(options = {}) {
	// Handle being called without 'new'
	if (!(this instanceof StubbornTCP)) {
		return new StubbornTCP(options);
	}

	// Initialize EventEmitter
	EventEmitter.call(this);

	const self = this;
	let client = null;

	// Extract options with defaults
	const {
		rxFunc,
		onConnect,
		onDisconnect,
		onError,
		onTimeout,
		heartbeatFunc,
		heartbeatInterval = 30000,
		heartbeatResetOnActivity = true,
		heartbeatEnabled = false,
		host,
		port,
		instance,
		bufferSize,
		debug = false,
		autoReconnect = true,
		reconnectDelay = 1000,
		maxReconnectDelay = 30000,
		reconnectBackoffFactor = 1.5,
		maxReconnectAttempts = -1, // -1 = infinite
		// Socket configuration options
		keepAlive = true,
		keepAliveInitialDelay = 60000,
		noDelay = true,
		connectionTimeout = 10000,
		idleTimeout = 0,
		// TLS/SSL options
		tls = false,
		tlsOptions = {}
	} = options;

	self._connectState = 0;
	self._openState = 1;
	self.onConnectFunc = null;
	self.onDisconnectFunc = null;
	self.instance = instance;

	// Organized settings structure
	self.settings = {
		debug,
		autoReconnect: {
			enabled: autoReconnect,
			delay: reconnectDelay,
			currentDelay: reconnectDelay,
			maxDelay: maxReconnectDelay,
			backoffFactor: reconnectBackoffFactor,
			maxAttempts: maxReconnectAttempts,
			attempts: 0,
			isReconnecting: false,
			timer: null
		},
		connection: {
			// Constructor values are the defaults for open() without arguments.
			host: host ?? null,
			port: port ?? null,
			timeout: connectionTimeout,
			idleTimeout
		},
		socket: {
			keepAlive,
			keepAliveInitialDelay,
			noDelay
		},
		tls: {
			enabled: tls,
			options: tlsOptions
		},
		heartbeat: {
			interval: heartbeatInterval,
			resetOnActivity: heartbeatResetOnActivity,
			enabled: heartbeatEnabled,
			timer: null,
			functions: [],
			currentFunctionIndex: 0
		}
	};

	// Organized function references structure
	self.functions = {
		rxFunc: null,
		onError: null,
		onTimeout: null
	};

	// Set function references from options (store actual function references, not names)
	if (typeof rxFunc === "function") {
		self.functions.rxFunc = rxFunc;
	}

	if (typeof onError === "function") {
		self.functions.onError = onError;
	}

	if (typeof onConnect === "function") {
		self.functions.onConnect = onConnect;
	}

	if (typeof onDisconnect === "function") {
		self.functions.onDisconnect = onDisconnect;
	}

	if (typeof onTimeout === "function") {
		self.functions.onTimeout = onTimeout;
	}

	// Set heartbeat functions
	if (heartbeatFunc) {
		if (Array.isArray(heartbeatFunc)) {
			self.settings.heartbeat.functions = [...heartbeatFunc];
		} else {
			self.settings.heartbeat.functions = [heartbeatFunc];
		}
	}

	// Add heartbeat function index for cycling
	self.settings.heartbeat.currentFunctionIndex = 0;

	// Compatible function setters using defineProperty (legacy support)
	Object.defineProperty(this, "OnConnectFunc", {
		get() {
			return self.functions.onConnect;
		},
		set(fn) {
			if (typeof fn === "function") {
				self.functions.onConnect = fn;
			} else {
				self.functions.onConnect = null;
			}
		},
		enumerable: true,
		configurable: true
	});

	Object.defineProperty(this, "OnDisconnectFunc", {
		get() {
			return self.functions.onDisconnect;
		},
		set(fn) {
			if (typeof fn === "function") {
				self.functions.onDisconnect = fn;
			} else {
				self.functions.onDisconnect = null;
			}
		},
		enumerable: true,
		configurable: true
	});

	// Modern camelCase equivalents
	Object.defineProperty(this, "connectState", {
		get() {
			return self._connectState;
		},
		enumerable: true
	});

	Object.defineProperty(this, "openState", {
		get() {
			return self._openState;
		},
		enumerable: true
	});

	Object.defineProperty(this, "isSecure", {
		get() {
			return self.settings.tls.enabled;
		},
		enumerable: true
	});

	Object.defineProperty(this, "localAddress", {
		get() {
			return client ? client.localAddress : null;
		},
		enumerable: true
	});

	Object.defineProperty(this, "localPort", {
		get() {
			return client ? client.localPort : null;
		},
		enumerable: true
	});

	Object.defineProperty(this, "remoteAddress", {
		get() {
			return client ? client.remoteAddress : null;
		},
		enumerable: true
	});

	Object.defineProperty(this, "remotePort", {
		get() {
			return client ? client.remotePort : null;
		},
		enumerable: true
	});

	/**
	 * Generate a unique handle for this TCP instance
	 * @private
	 * @returns {number} Unique handle
	 */
	const generateUniqueHandle = () => {
		return Math.floor(Math.random() * 90000) + 10000;
	};

	self.handle = generateUniqueHandle();
	self.Handle = self.handle; // Legacy support
	self.lCPrefix = `[StubbornTCP#${self.handle}] `;

	/**
	 * Emit debug message if debug mode is enabled
	 * @private
	 * @param {string} message - Debug message to emit
	 */
	const emitDebug = (message) => {
		if (self.settings.debug) {
			self.emit("debug", `${self.lCPrefix}${message}`, self.handle, self);
		}
	};

	emitDebug("initialized");

	/**
	 * Set delay between transmitted messages (not implemented)
	 * @param {number} ms - Milliseconds to delay
	 */
	// eslint-disable-next-line no-unused-vars -- documented legacy signature; the method is a no-op
	self.setTxInterMsgDelay = (ms) => {
		emitDebug("setTxInterMsgDelay() called - not implemented");
	};
	self.SetTxInterMsgDelay = self.setTxInterMsgDelay; // Legacy support

	/**
	 * Add RX framing (not implemented)
	 */
	self.addRxFraming = () => {
		emitDebug("addRxFraming() called - not implemented");
	};
	self.AddRxFraming = self.addRxFraming; // Legacy support

	/**
	 * Add HTTP RX framing (not implemented)
	 */
	self.addRxHTTPFraming = () => {
		emitDebug("addRxHTTPFraming() called - not implemented");
	};
	self.AddRxHTTPFraming = self.addRxHTTPFraming; // Legacy support

	/**
	 * Start heartbeat timer
	 * @private
	 */
	const startHeartbeatTimer = () => {
		if (!self.settings.heartbeat.enabled || self._connectState !== 1) return;

		if (self.settings.heartbeat.timer) {
			clearTimeout(self.settings.heartbeat.timer);
		}

		self.settings.heartbeat.timer = setTimeout(() => {
			sendHeartbeat();
		}, self.settings.heartbeat.interval);
	};

	/**
	 * Send heartbeat using the current function in the cycle
	 * @private
	 */
	const sendHeartbeat = () => {
		if (!self.settings.heartbeat.enabled || self._connectState !== 1) return;

		emitDebug("sending heartbeat");

		// Emit heartbeat event
		self.emit("heartbeat", self.handle, self);

		// Execute current heartbeat function if available
		if (self.settings.heartbeat.functions.length > 0) {
			const currentIndex = self.settings.heartbeat.currentFunctionIndex;
			const func = self.settings.heartbeat.functions[currentIndex];

			try {
				if (typeof func === "function") {
					func(self);
				}
			} catch (e) {
				emitDebug(`Error in heartbeat function ${currentIndex}: ${e.message}`);
				self.emit("heartbeatFailed", e, currentIndex, self.handle, self);
			}

			// Cycle to next function
			self.settings.heartbeat.currentFunctionIndex = (currentIndex + 1) % self.settings.heartbeat.functions.length;
		}

		// Schedule next heartbeat
		startHeartbeatTimer();
	};

	/**
	 * Reset heartbeat timer (called on activity if resetOnActivity is enabled)
	 * @private
	 */
	const resetHeartbeatTimer = () => {
		if (self.settings.heartbeat.enabled && self.settings.heartbeat.resetOnActivity) {
			startHeartbeatTimer();
		}
	};

	/**
	 * Enable heartbeat functionality
	 * @param {object} [options={}] - Heartbeat configuration options
	 * @param {number} [options.interval] - Heartbeat interval in milliseconds
	 * @param {function|function[]} [options.functions] - Function(s) to call for heartbeat
	 * @param {boolean} [options.resetOnActivity] - Reset timer on activity
	 */
	self.enableHeartbeat = (options = {}) => {
		const { interval, functions, resetOnActivity } = options;

		if (typeof interval === "number") {
			self.settings.heartbeat.interval = interval;
		}

		if (functions) {
			if (Array.isArray(functions)) {
				self.settings.heartbeat.functions = [...functions];
			} else {
				self.settings.heartbeat.functions = [functions];
			}
			// Reset index when new functions are set
			self.settings.heartbeat.currentFunctionIndex = 0;
		}

		if (typeof resetOnActivity === "boolean") {
			self.settings.heartbeat.resetOnActivity = resetOnActivity;
		}

		self.settings.heartbeat.enabled = true;

		emitDebug(
			`heartbeat enabled - interval: ${self.settings.heartbeat.interval}ms, functions: ${self.settings.heartbeat.functions.length}`
		);

		// Start heartbeat if connected
		if (self._connectState === 1) {
			startHeartbeatTimer();
		}
	};
	self.EnableHeartbeat = self.enableHeartbeat; // Legacy support

	/**
	 * Disable heartbeat functionality
	 */
	self.disableHeartbeat = () => {
		emitDebug("heartbeat disabled");
		self.settings.heartbeat.enabled = false;
		if (self.settings.heartbeat.timer) {
			clearTimeout(self.settings.heartbeat.timer);
			self.settings.heartbeat.timer = null;
		}
	};

	/**
	 * Add heartbeat function(s)
	 * @param {function|function[]} functions - Function(s) to add
	 */
	self.addHeartbeatFunction = (functions) => {
		if (Array.isArray(functions)) {
			self.settings.heartbeat.functions.push(...functions);
		} else {
			self.settings.heartbeat.functions.push(functions);
		}
		// Reset index to start from beginning when functions are added
		self.settings.heartbeat.currentFunctionIndex = 0;
		emitDebug(`heartbeat functions added, total: ${self.settings.heartbeat.functions.length}`);
	};

	/**
	 * Clear all heartbeat functions
	 */
	self.clearHeartbeatFunctions = () => {
		self.settings.heartbeat.functions = [];
		self.settings.heartbeat.currentFunctionIndex = 0;
		emitDebug("heartbeat functions cleared");
	};

	/**
	 * Configure socket keep-alive settings
	 * @param {boolean} enable - Enable keep-alive
	 * @param {number} [initialDelay] - Initial delay in milliseconds
	 */
	self.setKeepAlive = (enable, initialDelay) => {
		self.settings.socket.keepAlive = enable;
		if (typeof initialDelay === "number") {
			self.settings.socket.keepAliveInitialDelay = initialDelay;
		}

		// Apply to existing connection if available
		if (client && self._connectState === 1) {
			client.setKeepAlive(enable, self.settings.socket.keepAliveInitialDelay);
			emitDebug(`keep-alive ${enable ? "enabled" : "disabled"}`);
		}
	};

	/**
	 * Configure Nagle's algorithm (TCP_NODELAY)
	 * @param {boolean} noDelay - True to disable Nagle's algorithm for low latency
	 */
	self.setNoDelay = (noDelay) => {
		self.settings.socket.noDelay = noDelay;

		// Apply to existing connection if available
		if (client && self._connectState === 1) {
			client.setNoDelay(noDelay);
			emitDebug(`no-delay ${noDelay ? "enabled" : "disabled"}`);
		}
	};

	/**
	 * Set the connect-phase timeout (`connectionTimeout`). It bounds how long a connection
	 * attempt may take and never applies to an established connection: on a pending attempt
	 * the timer is re-armed, otherwise the value is recorded for the next attempt.
	 * @param {number} timeout - Timeout in milliseconds (0 or negative to disable)
	 */
	self.setTimeout = (timeout) => {
		self.settings.connection.timeout = timeout;

		// Re-arm on an attempt that is still connecting; an established connection is unaffected
		if (client && self._connectState === 0 && !client.destroyed) {
			client.setTimeout(timeout > 0 ? timeout : 0);
			emitDebug(timeout > 0 ? `connect timeout set to ${timeout}ms` : "connect timeout disabled");
		}
	};

	/**
	 * Set the idle timeout (`idleTimeout`) for an established connection. Applied to the live
	 * connection if there is one, and to every connection established afterwards.
	 * @param {number} timeout - Timeout in milliseconds (0 or negative to disable)
	 */
	self.setIdleTimeout = (timeout) => {
		self.settings.connection.idleTimeout = timeout;

		if (client && self._connectState === 1) {
			client.setTimeout(timeout > 0 ? timeout : 0);
			emitDebug(timeout > 0 ? `idle timeout set to ${timeout}ms` : "idle timeout disabled");
		}
	};

	/**
	 * Get TLS certificate information (only available for TLS connections)
	 * @returns {object|null} Certificate information or null if not TLS
	 */
	self.getPeerCertificate = () => {
		if (self.settings.tls.enabled && client && typeof client.getPeerCertificate === "function") {
			return client.getPeerCertificate();
		}
		return null;
	};

	/**
	 * Get TLS cipher information (only available for TLS connections)
	 * @returns {object|null} Cipher information or null if not TLS
	 */
	self.getCipher = () => {
		if (self.settings.tls.enabled && client && typeof client.getCipher === "function") {
			return client.getCipher();
		}
		return null;
	};

	/**
	 * Check if connection is authorized (only for TLS connections)
	 * @returns {boolean} True if authorized, false otherwise
	 */
	self.isAuthorized = () => {
		if (self.settings.tls.enabled && client && typeof client.authorized !== "undefined") {
			return client.authorized;
		}
		return true; // Non-TLS connections are considered authorized
	};

	/**
	 * Get authorization error (only for TLS connections)
	 * @returns {Error|null} Authorization error or null if authorized
	 */
	self.getAuthorizationError = () => {
		if (self.settings.tls.enabled && client && client.authorizationError) {
			return client.authorizationError;
		}
		return null;
	};

	/**
	 * Create and configure a new TCP/TLS client
	 * @private
	 * @param {string} host - Host to connect to
	 * @param {number} port - Port to connect to
	 * @returns {object} The TCP/TLS client instance
	 */
	const createClient = (host, port) => {
		if (client) {
			client.destroy();
			client = null;
		}

		self.settings.connection.host = host;
		self.settings.connection.port = port;
		self._openState = 1;

		// Per-attempt state: whether this socket ever connected, and whether its failure has
		// already been reported (a refused socket emits "error" once, but a timed-out one
		// reaches us through "timeout" instead, so both paths share reportConnectFailure()).
		let attemptConnected = false;
		let attemptFailureReported = false;

		/**
		 * Emit `failToConnect` once for this attempt, if it fails before `connect`.
		 * @param {Error} err - Why the attempt failed.
		 */
		const reportConnectFailure = (err) => {
			if (attemptConnected || attemptFailureReported) return;
			attemptFailureReported = true;
			emitDebug(`connection attempt to ${host}:${port} failed: ${err.message}`);
			self.emit("failToConnect", err, self.handle, self);
		};

		// Configure socket options after connection
		const handleConnection = () => {
			attemptConnected = true;

			// Configure socket options
			if (self.settings.socket.keepAlive) {
				client.setKeepAlive(true, self.settings.socket.keepAliveInitialDelay);
			}

			if (self.settings.socket.noDelay) {
				client.setNoDelay(true);
			}

			// The connect phase is over: swap the connect-phase timeout for the (opt-in) idle timeout
			const idle = self.settings.connection.idleTimeout;
			client.setTimeout(idle > 0 ? idle : 0);

			self._connectState = 1;
			self.settings.autoReconnect.isReconnecting = false;

			// Reset reconnection state on successful connection
			self.settings.autoReconnect.attempts = 0;
			self.settings.autoReconnect.currentDelay = self.settings.autoReconnect.delay;

			emitDebug(`connected to ${host}:${port}`);

			// Emit connect event
			self.emit("connect", self.handle, self);

			// Call connect callback (legacy support)
			if (typeof self.functions.onConnect === "function") {
				try {
					self.functions.onConnect(self.handle, self);
				} catch (e) {
					emitDebug(`Error in OnConnectFunc: ${e.message}`);
				}
			}

			// Start heartbeat if enabled
			if (self.settings.heartbeat.enabled) {
				startHeartbeatTimer();
			}
		};

		// Create appropriate socket type
		if (self.settings.tls.enabled) {
			// Create TLS socket
			const tlsOptions = {
				host,
				port,
				...self.settings.tls.options
			};
			client = nodeTls.connect(tlsOptions, handleConnection);
		} else {
			// Create regular TCP socket
			client = new net.Socket();
			client.connect(port, host, handleConnection);
		}

		// The socket this attempt owns. open() may replace it with a newer one while it is
		// still closing; its late events must then leave the client's state alone.
		const socket = client;

		// Arm the connect-phase timeout for both TCP and TLS. handleConnection() clears it (or
		// replaces it with the idle timeout) once connected, so it never fires on an open connection.
		const connectTimeout = self.settings.connection.timeout;
		client.setTimeout(connectTimeout > 0 ? connectTimeout : 0);
		client.on("timeout", () => {
			emitDebug(self._connectState === 1 ? "idle timeout" : "connection timeout");

			// A timeout before the connection is up is a failed attempt; the socket is
			// destroyed below without an error, so report the failure here.
			if (!attemptConnected) {
				const timeoutError = new Error(`connection to ${host}:${port} timed out after ${self.settings.connection.timeout}ms`);
				timeoutError.code = "ETIMEDOUT";
				reportConnectFailure(timeoutError);
			}

			// Emit timeout event
			self.emit("timeout", self.handle, self);

			// Call timeout callback (legacy support)
			if (typeof self.functions.onTimeout === "function") {
				try {
					self.functions.onTimeout(self.handle, self);
				} catch (e) {
					emitDebug(`Error in onTimeout callback: ${e.message}`);
				}
			}

			client.destroy();
		});

		client.on("data", (data) => {
			// Reset heartbeat timer on received data
			resetHeartbeatTimer();

			// Emit data event
			self.emit("data", data, self.handle, self);

			// Call rx callback (legacy support)
			if (typeof self.functions.rxFunc === "function") {
				try {
					self.functions.rxFunc(data, self);
				} catch (e) {
					emitDebug(`Error in rxFunc: ${e.message}`);
				}
			}
		});
		client.on("close", () => {
			// A replaced socket closing after open() started a new one: ignore it, or it would
			// mark the new connection disconnected, emit a spurious disconnect and reconnect.
			// (After close() there is no current socket, so the disconnect is still reported.)
			if (client !== null && client !== socket) {
				emitDebug("ignoring close from a replaced socket");
				return;
			}

			self._connectState = 0;

			// Stop heartbeat on disconnect
			if (self.settings.heartbeat.timer) {
				clearTimeout(self.settings.heartbeat.timer);
				self.settings.heartbeat.timer = null;
			}

			emitDebug("connection closed");

			// Emit disconnect event
			self.emit("disconnect", self.handle, self);

			// Call disconnect callback (legacy support)
			if (typeof self.functions.onDisconnect === "function") {
				try {
					self.functions.onDisconnect(self.handle, self);
				} catch (e) {
					emitDebug(`Error in OnDisconnectFunc: ${e.message}`);
				}
			}

			// Exponential backoff reconnect logic
			if (self.settings.autoReconnect.enabled && !self.settings.autoReconnect.isReconnecting) {
				// Check if we've exceeded max attempts
				if (
					self.settings.autoReconnect.maxAttempts > 0 &&
					self.settings.autoReconnect.attempts >= self.settings.autoReconnect.maxAttempts
				) {
					emitDebug(`max reconnect attempts (${self.settings.autoReconnect.maxAttempts}) reached`);
					self.emit("maxReconnectAttemptsReached", self.settings.autoReconnect.attempts);
					return;
				}

				self.settings.autoReconnect.isReconnecting = true;
				self.settings.autoReconnect.attempts++;

				emitDebug(`schedule reconnect attempt ${self.settings.autoReconnect.attempts} in ${self.settings.autoReconnect.currentDelay}ms`);

				if (self.settings.autoReconnect.timer) {
					clearTimeout(self.settings.autoReconnect.timer);
					self.settings.autoReconnect.timer = null;
				}

				self.settings.autoReconnect.timer = setTimeout(() => {
					self.settings.autoReconnect.isReconnecting = false;
					if (self._connectState === 0 && self.settings.autoReconnect.enabled) {
						// Still disconnected and allowed to reconnect
						emitDebug(
							`reconnect attempt ${self.settings.autoReconnect.attempts} [${self.settings.connection.host}:${self.settings.connection.port}]`
						);
						createClient(self.settings.connection.host, self.settings.connection.port);
					}
				}, self.settings.autoReconnect.currentDelay);

				// Apply exponential backoff for next attempt
				self.settings.autoReconnect.currentDelay = Math.min(
					self.settings.autoReconnect.currentDelay * self.settings.autoReconnect.backoffFactor,
					self.settings.autoReconnect.maxDelay
				);
			}
		});

		client.on("error", (err) => {
			emitDebug(`connection error: ${err.message}`);

			reportConnectFailure(err);

			// Emit error event only when someone listens: EventEmitter throws on an unhandled
			// "error", and the close/reconnect logic already handles the failure, so an
			// unobserved socket error must not crash the process.
			if (self.listenerCount("error") > 0) {
				self.emit("error", err, self.handle, self);
			} else {
				emitDebug("no error listener attached; error reported via debug only");
			}

			// Call error callback (legacy support)
			if (typeof self.functions.onError === "function") {
				try {
					self.functions.onError(self.handle, self, err);
				} catch (e) {
					emitDebug(`Error in onError: ${e.message}`);
				}
			}
		});

		// TLS-specific event handlers
		if (self.settings.tls.enabled) {
			client.on("secureConnect", () => {
				emitDebug("TLS secure connection established");
				if (client.authorized) {
					emitDebug("TLS certificate authorized");
				} else {
					emitDebug(`TLS certificate not authorized: ${client.authorizationError?.message}`);
				}
				self.emit("secureConnect", self.handle, self);
			});

			client.on("keylog", (line) => {
				self.emit("keylog", line, self.handle, self);
			});

			client.on("OCSPResponse", (response) => {
				self.emit("OCSPResponse", response, self.handle, self);
			});
		}

		return self;
	};

	/**
	 * Write data to the TCP socket
	 * @param {string|Buffer} data - Data to send
	 * @returns {boolean} True if data was written successfully
	 */
	self.write = (data) => {
		if (self._connectState === 1 && client) {
			try {
				client.write(data);
				// Reset heartbeat timer on activity
				resetHeartbeatTimer();
				return true;
			} catch (e) {
				emitDebug(`write error: ${e.message}`);
				return false;
			}
		} else {
			emitDebug("write called but not connected");
			return false;
		}
	};
	self.Write = self.write; // Legacy support

	/**
	 * Reset reconnection state (attempts and delay)
	 */
	self.resetReconnectState = () => {
		emitDebug("resetReconnectState() called");
		self.settings.autoReconnect.attempts = 0;
		self.settings.autoReconnect.currentDelay = self.settings.autoReconnect.delay;
	};
	self.ResetReconnectState = self.resetReconnectState; // Legacy support

	/**
	 * Close the TCP connection and disable auto-reconnect
	 */
	self.close = () => {
		emitDebug("close() called");
		self.settings.autoReconnect.enabled = false;
		if (self.settings.autoReconnect.timer) {
			clearTimeout(self.settings.autoReconnect.timer);
			self.settings.autoReconnect.timer = null;
		}
		// Stop heartbeat
		self.disableHeartbeat();
		if (client) {
			client.destroy();
			client = null;
		}
		self._connectState = 0;
		self.resetReconnectState();
	};
	self.Close = self.close; // Legacy support

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
	// eslint-disable-next-line no-unused-vars -- `instance` / `bufferSizeArg` are accepted for legacy callers and ignored
	self.open = (host, port, instance, bufferSizeArg) => {
		// Explicit arguments win; otherwise use the last host/port, which starts out as the
		// constructor's `host` / `port` options.
		host = host ?? self.settings.connection.host ?? undefined;
		port = port ?? self.settings.connection.port;
		if (port === null || port === undefined) {
			const err = new TypeError(
				"StubbornTCP.open(): no port to connect to; pass open(host, port) or set the host and port constructor options"
			);
			err.code = "ERR_MISSING_ARGS";
			throw err;
		}
		emitDebug(`open(${host}:${port})`);

		// Replace any existing connection or pending reconnect. Unlike close(), this keeps
		// auto-reconnect and the heartbeat configuration as they are: createClient() destroys
		// the old socket, whose late close event is then ignored.
		if (self.settings.autoReconnect.timer) {
			clearTimeout(self.settings.autoReconnect.timer);
			self.settings.autoReconnect.timer = null;
		}
		self.settings.autoReconnect.isReconnecting = false;
		if (self.settings.heartbeat.timer) {
			clearTimeout(self.settings.heartbeat.timer);
			self.settings.heartbeat.timer = null;
		}
		self._connectState = 0;
		return createClient(host, port);
	};
	self.Open = self.open; // Legacy support

	// Auto-connect if host and port are supplied
	if (typeof host === "string" && typeof port === "number") {
		return self.open(host, port, instance, bufferSize);
	}

	return this;
}

// Set up prototype inheritance from EventEmitter
StubbornTCP.prototype = Object.create(EventEmitter.prototype);
StubbornTCP.prototype.constructor = StubbornTCP;

// ESM export (default)
export default StubbornTCP;

// Named export for compatibility
export { StubbornTCP };
