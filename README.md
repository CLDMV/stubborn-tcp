# @cldmv/stubborn-tcp

> A stubbornly persistent TCP/TLS client that automatically reconnects when connections fail

[![npm version](https://badge.fury.io/js/%40cldmv%2Fstubborn-tcp.svg)](https://badge.fury.io/js/%40cldmv%2Fstubborn-tcp)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

## Features

- 🔄 **Auto-reconnection**: Intelligent exponential backoff reconnection strategy
- 🔒 **TLS/SSL Support**: Full TLS encryption with certificate validation
- 🚀 **Socket Optimization**: TCP keep-alive, no-delay, and timeout configuration
- 💓 **Application Heartbeat**: Cycling heartbeat functions with activity-based reset
- 🎯 **Modern API**: Options-based constructor with EventEmitter support
- 📦 **Dual Module Support**: Works with both ESM (`import`) and CommonJS (`require`)
- 🛡️ **Production Ready**: Comprehensive error handling and connection monitoring
- 🔧 **Highly Configurable**: Fine-grained control over all connection parameters
- 📝 **Well Documented**: Comprehensive JSDoc documentation with examples

## Installation

```bash
npm install @cldmv/stubborn-tcp
```

## Quick Start

### Basic TCP Connection

```javascript
import StubbornTCP from "@cldmv/stubborn-tcp";

// Modern options-based API
const client = new StubbornTCP({
	host: "localhost",
	port: 8080,
	debug: true
});

// Event-driven approach
client.on("connect", () => console.log("Connected!"));
client.on("data", (data) => console.log("Received:", data.toString()));
client.on("disconnect", () => console.log("Disconnected, will retry..."));

// Send data
client.write("Hello, server!");
```

### TLS/SSL Secure Connection

```javascript
const secureClient = new StubbornTCP({
	host: "secure.example.com",
	port: 443,
	tls: true,
	tlsOptions: {
		rejectUnauthorized: true,
		servername: "secure.example.com"
	}
});

secureClient.on("secureConnect", () => {
	console.log("Secure connection established");
	console.log("Certificate:", secureClient.getPeerCertificate());
});
```

### Advanced Configuration

```javascript
const client = new StubbornTCP({
	host: "localhost",
	port: 8080,

	// Connection options
	keepAlive: true,
	keepAliveInitialDelay: 30000,
	noDelay: true,
	connectionTimeout: 5000,

	// Reconnection strategy
	autoReconnect: true,
	reconnectDelay: 1000,
	maxReconnectDelay: 30000,
	reconnectBackoffFactor: 2.0,
	maxReconnectAttempts: 10,

	// Application heartbeat
	heartbeatEnabled: true,
	heartbeatInterval: 15000,
	heartbeatFunc: [(client) => client.write("PING"), (client) => client.write("KEEPALIVE")]
});
```

## API Reference

### Constructor

```javascript
new StubbornTCP(options);
```

**Configuration Options:**

#### Connection Options

- `host` _(string)_: Host to connect to
- `port` _(number)_: Port to connect to
- `debug` _(boolean, default: false)_: Enable debug logging

#### Socket Options

- `keepAlive` _(boolean, default: true)_: Enable TCP keep-alive
- `keepAliveInitialDelay` _(number, default: 60000)_: Keep-alive initial delay (ms)
- `noDelay` _(boolean, default: true)_: Disable Nagle's algorithm
- `connectionTimeout` _(number, default: 10000)_: Connection timeout (ms)

#### TLS/SSL Options

- `tls` _(boolean, default: false)_: Enable TLS encryption
- `tlsOptions` _(object, default: {})_: TLS configuration (certificates, etc.)

#### Reconnection Options

- `autoReconnect` _(boolean, default: true)_: Enable auto-reconnection
- `reconnectDelay` _(number, default: 1000)_: Initial reconnect delay (ms)
- `maxReconnectDelay` _(number, default: 30000)_: Maximum reconnect delay (ms)
- `reconnectBackoffFactor` _(number, default: 1.5)_: Exponential backoff multiplier
- `maxReconnectAttempts` _(number, default: -1)_: Max attempts (-1 = infinite)

#### Heartbeat Options

- `heartbeatEnabled` _(boolean, default: false)_: Enable application heartbeat
- `heartbeatInterval` _(number, default: 30000)_: Heartbeat interval (ms)
- `heartbeatFunc` _(function|array)_: Function(s) to call for heartbeat
- `heartbeatResetOnActivity` _(boolean, default: true)_: Reset timer on activity

#### Legacy Callback Options

- `rxFunc` _(function)_: Data received callback
- `onConnect` _(function)_: Connection established callback
- `onDisconnect` _(function)_: Connection lost callback
- `onError` _(function)_: Error occurred callback

### Methods

#### Connection Methods

- `open(host, port)` - Open connection to host:port
- `close()` - Close connection and disable auto-reconnect
- `write(data)` - Send data to remote host

#### Socket Configuration Methods

- `setKeepAlive(enable, initialDelay)` - Configure TCP keep-alive
- `setNoDelay(noDelay)` - Configure Nagle's algorithm
- `setTimeout(timeout)` - Set connection timeout

#### Heartbeat Methods

- `enableHeartbeat(options)` - Enable heartbeat with options object
- `disableHeartbeat()` - Disable heartbeat functionality
- `addHeartbeatFunction(functions)` - Add heartbeat function(s)
- `clearHeartbeatFunctions()` - Clear all heartbeat functions

#### TLS Methods (TLS connections only)

- `getPeerCertificate()` - Get peer certificate information
- `getCipher()` - Get cipher information
- `isAuthorized()` - Check if connection is authorized
- `getAuthorizationError()` - Get authorization error details

#### Utility Methods

- `resetReconnectState()` - Reset reconnection attempt counter

### Properties

#### Connection State

- `connectState` _(read-only)_: 0 = disconnected, 1 = connected
- `openState` _(read-only)_: Connection open state
- `handle` _(read-only)_: Unique connection identifier

#### Connection Information

- `isSecure` _(read-only)_: Whether connection uses TLS
- `localAddress` _(read-only)_: Local IP address
- `localPort` _(read-only)_: Local port number
- `remoteAddress` _(read-only)_: Remote IP address
- `remotePort` _(read-only)_: Remote port number

### Events

#### Connection Events

- `connect` - Connection established
- `disconnect` - Connection lost
- `data` - Data received
- `error` - Error occurred (only emitted while an `error` listener is attached; without one, errors go to the `debug` event and the client keeps reconnecting instead of crashing the process)
- `failToConnect` `(error, handle, instance)` - A connection attempt (the first one or a reconnect) failed before `connect`; fires once per failed attempt, before `error`. A timeout before connecting reports an `ETIMEDOUT` error

#### Reconnection Events

- `maxReconnectAttemptsReached` - Max reconnect attempts reached

#### Heartbeat Events

- `heartbeat` - Heartbeat sent
- `heartbeatFailed` - Heartbeat function failed

#### TLS Events (TLS connections only)

- `secureConnect` - TLS secure connection established
- `keylog` - TLS key material generated/received
- `OCSPResponse` - OCSP response received

## Auto-Reconnection with Exponential Backoff

StubbornTCP features intelligent reconnection with exponential backoff:

- **Initial Delay**: 1000ms (configurable)
- **Maximum Delay**: 30000ms (configurable)
- **Backoff Factor**: 1.5x (configurable)
- **Unlimited Attempts**: By default (configurable)
- **Reset on Success**: Delay resets after successful connection

## Advanced Examples

### Complete Configuration Example

```javascript
import StubbornTCP from "@cldmv/stubborn-tcp";

const client = new StubbornTCP({
	// Connection settings
	host: "localhost",
	port: 8080,
	debug: true,

	// Socket optimization
	keepAlive: true,
	keepAliveInitialDelay: 60000,
	noDelay: true,
	connectionTimeout: 15000,

	// TLS encryption
	tls: true,
	tlsOptions: {
		rejectUnauthorized: false,
		cert: fs.readFileSync("client-cert.pem"),
		key: fs.readFileSync("client-key.pem"),
		ca: fs.readFileSync("ca-cert.pem")
	},

	// Reconnection strategy
	autoReconnect: true,
	reconnectDelay: 2000,
	maxReconnectDelay: 60000,
	reconnectBackoffFactor: 2.0,
	maxReconnectAttempts: 10,

	// Application heartbeat
	heartbeatEnabled: true,
	heartbeatInterval: 30000,
	heartbeatFunc: [(socket) => socket.write("PING\n"), (socket) => console.log("💓 Heartbeat sent")]
});

// Event-driven approach
client.on("connect", (handle, socket) => {
	console.log("🔗 Connected securely");
	socket.write("Hello secure server!");
});

client.on("data", (data, socket) => {
	console.log("📨 Received:", data.toString());
});

client.on("secureConnect", () => {
	const cert = client.getPeerCertificate();
	console.log("🔒 TLS Certificate:", cert.subject);
});

client.open();
```

### Heartbeat with Multiple Functions

```javascript
const client = new StubbornTCP({
	host: "localhost",
	port: 8080
});

// Enable heartbeat with multiple functions
client.enableHeartbeat({
	interval: 15000,
	resetOnActivity: true,
	functions: [(socket) => socket.write("KEEPALIVE\n"), (socket) => console.log("� Keep-alive sent"), (socket) => updateLastHeartbeat()]
});

client.on("heartbeatFailed", (error) => {
	console.error("💔 Heartbeat failed:", error.message);
});

client.open();
```

### Socket Configuration at Runtime

```javascript
const client = new StubbornTCP();

client.on("connect", () => {
	// Optimize socket after connection
	client.setKeepAlive(true, 30000);
	client.setNoDelay(true);
	client.setTimeout(60000);

	console.log("Socket optimized for performance");
});

client.open("api.example.com", 443);
```

## Migration from Legacy API

### Old Style (Deprecated)

```javascript
const client = new StubbornTCP(rxFunc, "localhost", 8080, instance, bufferSize, debug);
client.OnConnectFunc = onConnect;
client.OnDisconnectFunc = onDisconnect;
client.Open("localhost", 8080);
```

### New Style (Recommended)

```javascript
const client = new StubbornTCP({
	host: "localhost",
	port: 8080,
	debug,
	rxFunc,
	onConnect,
	onDisconnect
});
client.open();
```

## Compatibility

- **Node.js**: 14.0+ for `import`; `require()` needs Node.js ^20.19.0 or >=22.12.0 (it loads the ES module build through `require(esm)`, and throws `ERR_REQUIRE_ESM` with a pointer to `import()` on older versions)
- **Operating Systems**: Windows, macOS, Linux
- **Protocol Support**: TCP and TLS/SSL
- **Legacy API**: Maintained for backward compatibility

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the Apache License Version 2.0 - see the [LICENSE](LICENSE) file for details.

## Error Handling

The client handles various error conditions gracefully:

- **Connection refused**: Automatically retries connection
- **Network timeouts**: Continues reconnection attempts
- **Server disconnection**: Attempts to reconnect after delay
- **Write errors**: Returns false, connection state updated

## Compatibility

- **Node.js**: >= 14.0.0
- **Module Systems**: ESM (`import`) and CommonJS (`require()`, Node.js ^20.19.0 or >=22.12.0)
- **Platforms**: Windows, macOS, Linux

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/awesome-feature`)
3. Commit your changes (`git commit -am 'Add awesome feature'`)
4. Push to the branch (`git push origin feature/awesome-feature`)
5. Open a Pull Request

## License

This project is licensed under the Apache License Version 2.0 - see the [LICENSE](LICENSE) file for details.

## Changelog

### 1.0.0

- Initial release
- Auto-reconnecting TCP client
- Dual module support (ESM/CommonJS)
- Comprehensive documentation
