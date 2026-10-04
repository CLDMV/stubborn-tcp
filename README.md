# @cldmv/stubborn-tcp

**@cldmv/stubborn-tcp** is a TCP and TLS client for Node.js that refuses to stay disconnected. When the connection drops, it reconnects on its own with exponential backoff, and it can keep a quiet link alive with TCP keep-alive and application-level heartbeats.

It is built for long-lived connections to devices and services — control protocols, telemetry feeds, line-based servers — where the remote end restarts, the network blips, and the client is expected to simply carry on. Everything is exposed through an `EventEmitter`, with legacy callback options kept for code ported from older clients.

> _A stubbornly persistent TCP/TLS client that automatically reconnects when connections fail._

[![npm version]][npm_version_url] [![npm downloads]][npm_downloads_url] [![GitHub downloads]][github_downloads_url] [![Last commit]][last_commit_url] [![npm last update]][npm_last_update_url] [![coverage]][coverage_url]

[![Contributors]][contributors_url] [![Sponsor shinrai]][sponsor_url]

---

## ✨ What's New

### Latest: v1.0.4 (October 2026)

- **TLS connections work** — the `tls` option shadowed Node.js's `tls` module inside the constructor, so every TLS connection attempt threw `tls.connect is not a function`. `tls: true` now connects over TLS, and `secureConnect` and the TLS helper methods work as documented (#1).
- **Built package with TypeScript declarations** — the code now ships as a minified `dist/` bundle with `.d.mts` declarations; `test/` and `examples/` are no longer published. The package root exports are unchanged, and `require()` (Node.js ^20.19.0 or >=22.12.0) now works in esbuild/webpack bundles and fails with a clear `ERR_REQUIRE_ESM` message on older Node.js (#1).
- **Connection fixes** — an unobserved socket error no longer crashes the process, `failToConnect` now fires for each failed attempt, `open()` on a connected client keeps it usable, `open()` without arguments uses the constructor's host and port, and `connectionTimeout` no longer drops idle connections (a new opt-in `idleTimeout` covers that) ([#9](https://github.com/CLDMV/stubborn-tcp/pull/9), [#10](https://github.com/CLDMV/stubborn-tcp/pull/10), [#11](https://github.com/CLDMV/stubborn-tcp/pull/11), [#13](https://github.com/CLDMV/stubborn-tcp/pull/13)).
- [View full v1.0.4 Changelog](https://github.com/CLDMV/stubborn-tcp/blob/master/docs/changelog/v1/v1.0.4.md)

### Recent Releases

- **v1.0.3** (October 2025) — `debug: true` emits `debug` events instead of printing to the console; zero or negative timeouts disable the socket timeout ([Changelog](https://github.com/CLDMV/stubborn-tcp/blob/master/docs/changelog/v1/v1.0.3.md))
- **v1.0.2** (October 2025) — `data` event arguments become `(data, handle, instance)` ([Changelog](https://github.com/CLDMV/stubborn-tcp/blob/master/docs/changelog/v1/v1.0.2.md))
- **v1.0.1** (October 2025) — `require()` returns the constructor instead of a Promise ([Changelog](https://github.com/CLDMV/stubborn-tcp/blob/master/docs/changelog/v1/v1.0.1.md))
- **v1.0.0** (October 2025) — Initial release: auto-reconnecting TCP client with backoff, socket tuning and heartbeats ([Changelog](https://github.com/CLDMV/stubborn-tcp/blob/master/docs/changelog/v1/v1.0.0.md))

📚 **For complete version history and detailed release notes, see the [docs/changelog/](https://github.com/CLDMV/stubborn-tcp/tree/master/docs/changelog/) folder.**

---

## 🚀 Key Features

- 🔄 **Auto-reconnection**: Intelligent exponential backoff reconnection strategy
- 🔒 **TLS/SSL Support**: Full TLS encryption with certificate validation
- 🚀 **Socket Optimization**: TCP keep-alive, no-delay, and timeout configuration
- 💓 **Application Heartbeat**: Cycling heartbeat functions with activity-based reset
- 🎯 **Modern API**: Options-based constructor with EventEmitter support
- 📦 **Dual Module Support**: Works with both ESM (`import`) and CommonJS (`require`)
- 🛡️ **Production Ready**: Comprehensive error handling and connection monitoring
- 🔧 **Highly Configurable**: Fine-grained control over all connection parameters
- 📝 **Well Documented**: Comprehensive JSDoc documentation and TypeScript declarations

---

## 📦 Installation

### Requirements

- **Node.js 14.0 or higher** for `import` (ESM).
- **`require()` needs Node.js ^20.19.0 or >=22.12.0** — the CommonJS entry loads the ES module build through `require(esm)`, and throws `ERR_REQUIRE_ESM` with a pointer to `import()` on older versions.
- **Platforms**: Windows, macOS, Linux.
- **Protocol Support**: TCP and TLS/SSL.

### Install

```bash
npm install @cldmv/stubborn-tcp
```

---

## 🚀 Quick Start

Passing `host` and `port` to the constructor connects immediately. Omit them and call `open(host, port)` when you want to connect later.

### Basic TCP Connection

```javascript
import StubbornTCP from "@cldmv/stubborn-tcp";
// CommonJS: const StubbornTCP = require("@cldmv/stubborn-tcp");

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
client.on("debug", (message) => console.log(message));

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

---

## 📖 API Reference

### Constructor

```javascript
new StubbornTCP(options);
```

**Configuration Options:**

#### Connection Options

- `host` _(string)_: Host to connect to (also the default for `open()` called without arguments)
- `port` _(number)_: Port to connect to (also the default for `open()` called without arguments). With both `host` and `port` set, the client connects immediately
- `debug` _(boolean, default: false)_: Emit `debug` events with diagnostic messages

#### Socket Options

- `keepAlive` _(boolean, default: true)_: Enable TCP keep-alive
- `keepAliveInitialDelay` _(number, default: 60000)_: Keep-alive initial delay (ms)
- `noDelay` _(boolean, default: true)_: Disable Nagle's algorithm
- `connectionTimeout` _(number, default: 10000)_: Connect-phase timeout (ms). Bounds how long each connection attempt (including the TLS handshake) may take; a timed-out attempt is closed and goes through the normal reconnect path. It is cleared once connected, so it never closes an established connection. `0` or negative disables it
- `idleTimeout` _(number, default: 0)_: Idle timeout (ms) for an established connection — with no socket activity for this long, the connection is timed out and closed (and reconnected if `autoReconnect` is on). `0` or negative disables it (the default)

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
- `heartbeatFunc` _(function|array)_: Function(s) to call for heartbeat; each receives the client instance
- `heartbeatResetOnActivity` _(boolean, default: true)_: Reset timer on activity

#### Legacy Callback Options

- `rxFunc` _(function)_: Data received callback
- `onConnect` _(function)_: Connection established callback
- `onDisconnect` _(function)_: Connection lost callback
- `onError` _(function)_: Error occurred callback
- `onTimeout` _(function)_: Connection timeout callback

### Methods

#### Connection Methods

- `open(host, port)` - Open connection to host:port (closes an existing connection first)
- `close()` - Close connection and disable auto-reconnect
- `write(data)` - Send data to remote host

#### Socket Configuration Methods

- `setKeepAlive(enable, initialDelay)` - Configure TCP keep-alive
- `setNoDelay(noDelay)` - Configure Nagle's algorithm
- `setTimeout(timeout)` - Set the connect-phase timeout (`connectionTimeout`); re-arms a pending attempt, never affects an established connection
- `setIdleTimeout(timeout)` - Set the idle timeout (`idleTimeout`); applies to the live connection and later ones

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

Most events pass the connection `handle` and the client instance as their last two arguments.

#### Connection Events

- `connect` `(handle, instance)` - Connection established
- `disconnect` `(handle, instance)` - Connection lost
- `data` `(data, handle, instance)` - Data received
- `error` `(error, handle, instance)` - Error occurred (only emitted while an `error` listener is attached; without one, errors go to the `debug` event and the client keeps reconnecting instead of crashing the process)
- `failToConnect` `(error, handle, instance)` - A connection attempt (the first one or a reconnect) failed before `connect`; fires once per failed attempt, before `error`. A timeout before connecting reports an `ETIMEDOUT` error
- `timeout` `(handle, instance)` - A connection attempt timed out (`connectionTimeout`), or an established connection was idle for `idleTimeout`

#### Reconnection Events

- `maxReconnectAttemptsReached` `(attempts)` - Max reconnect attempts reached

#### Heartbeat Events

- `heartbeat` `(handle, instance)` - Heartbeat sent
- `heartbeatFailed` `(error, functionIndex, handle, instance)` - Heartbeat function failed

#### TLS Events (TLS connections only)

- `secureConnect` `(handle, instance)` - TLS secure connection established
- `keylog` `(line, handle, instance)` - TLS key material generated/received
- `OCSPResponse` `(response, handle, instance)` - OCSP response received

#### Debug Events

- `debug` `(message, handle, instance)` - Diagnostic message, emitted only when `debug: true`

---

## 🔄 Auto-Reconnection with Exponential Backoff

StubbornTCP features intelligent reconnection with exponential backoff:

- **Initial Delay**: 1000ms (configurable)
- **Maximum Delay**: 30000ms (configurable)
- **Backoff Factor**: 1.5x (configurable)
- **Unlimited Attempts**: By default (configurable)
- **Reset on Success**: Delay resets after successful connection

---

## 🧪 Advanced Examples

### Complete Configuration Example

```javascript
import fs from "node:fs";
import StubbornTCP from "@cldmv/stubborn-tcp";

// host and port are given, so the client connects immediately
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
	heartbeatFunc: [(client) => client.write("PING\n"), (client) => console.log("💓 Heartbeat sent")]
});

// Event-driven approach
client.on("connect", (handle, instance) => {
	console.log("🔗 Connected securely");
	instance.write("Hello secure server!");
});

client.on("data", (data, handle, instance) => {
	console.log("📨 Received:", data.toString());
});

client.on("secureConnect", () => {
	const cert = client.getPeerCertificate();
	console.log("🔒 TLS Certificate:", cert.subject);
});
```

### Heartbeat with Multiple Functions

```javascript
const client = new StubbornTCP();

// Enable heartbeat with multiple functions
client.enableHeartbeat({
	interval: 15000,
	resetOnActivity: true,
	functions: [(client) => client.write("KEEPALIVE\n"), (client) => console.log("💓 Keep-alive sent"), (client) => updateLastHeartbeat()]
});

client.on("heartbeatFailed", (error) => {
	console.error("💔 Heartbeat failed:", error.message);
});

client.open("localhost", 8080);
```

### Socket Configuration at Runtime

```javascript
const client = new StubbornTCP();

client.on("connect", () => {
	// Optimize socket after connection
	client.setKeepAlive(true, 30000);
	client.setNoDelay(true);
	client.setIdleTimeout(60000);

	console.log("Socket optimized for performance");
});

client.open("api.example.com", 443);
```

---

## 🔁 Migration from Legacy API

The constructor only accepts an options object. Code written against the older positional constructor needs its arguments moved into options; the legacy `Open()` and `Write()` methods and the `OnConnectFunc` / `OnDisconnectFunc` properties are still available as aliases.

### Old Style (Deprecated)

```javascript
const client = new StubbornTCP(rxFunc, "localhost", 8080, instance, bufferSize, debug);
client.OnConnectFunc = onConnect;
client.OnDisconnectFunc = onDisconnect;
client.Open("localhost", 8080);
```

### New Style (Recommended)

```javascript
// Connects immediately because host and port are given
const client = new StubbornTCP({
	host: "localhost",
	port: 8080,
	debug,
	rxFunc,
	onConnect,
	onDisconnect
});
```

---

## 🛡 Error Handling

The client handles various error conditions gracefully:

- **Connection refused**: Automatically retries connection
- **Network timeouts**: Continues reconnection attempts
- **Server disconnection**: Attempts to reconnect after delay
- **Write errors**: Returns false, connection state updated

---

## 📚 Documentation

- **[Usage examples](https://github.com/CLDMV/stubborn-tcp/blob/master/examples/usage-examples.md)** — ESM and CommonJS usage
- **[Changelog](https://github.com/CLDMV/stubborn-tcp/tree/master/docs/changelog/)** — release notes for every version

[![CodeFactor]][codefactor_url] [![OpenSSF Scorecard]][ossf_scorecard_url] [![npms.io score]][npms_url] [![npm unpacked size]][npm_size_url] [![Repo size]][repo_size_url]

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch off `next` (`git checkout -b feat/amazing-feature origin/next`)
3. Commit your changes (`git commit -m 'feat: add some amazing feature'`)
4. Push to the branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request into `next`

[![Contributors]][contributors_url] [![Sponsor shinrai]][sponsor_url]

---

## 🔗 Links

- **npm**: [@cldmv/stubborn-tcp](https://www.npmjs.com/package/@cldmv/stubborn-tcp)
- **GitHub**: [CLDMV/stubborn-tcp](https://github.com/CLDMV/stubborn-tcp)
- **Issues**: [GitHub Issues](https://github.com/CLDMV/stubborn-tcp/issues)
- **Changelog**: [docs/changelog/](https://github.com/CLDMV/stubborn-tcp/tree/master/docs/changelog/)

---

## 📄 License

[![GitHub license]][github_license_url] [![npm license]][npm_license_url]

This project is licensed under the Apache License Version 2.0 - see the [LICENSE](https://github.com/CLDMV/stubborn-tcp/blob/HEAD/LICENSE) file for details.

[npm version]: https://img.shields.io/npm/v/%40cldmv%2Fstubborn-tcp.svg?style=for-the-badge&logo=npm&logoColor=white&labelColor=CB3837
[npm_version_url]: https://www.npmjs.com/package/@cldmv/stubborn-tcp
[last commit]: https://img.shields.io/github/last-commit/CLDMV/stubborn-tcp?style=for-the-badge&logo=github&logoColor=white&labelColor=181717
[last_commit_url]: https://github.com/CLDMV/stubborn-tcp/commits
[npm last update]: https://img.shields.io/npm/last-update/%40cldmv%2Fstubborn-tcp?style=for-the-badge&logo=npm&logoColor=white&labelColor=CB3837
[npm_last_update_url]: https://www.npmjs.com/package/@cldmv/stubborn-tcp
[codefactor]: https://img.shields.io/codefactor/grade/github/CLDMV/stubborn-tcp?style=for-the-badge&logo=codefactor&logoColor=white&labelColor=F44A6A
[codefactor_url]: https://www.codefactor.io/repository/github/cldmv/stubborn-tcp
[openssf scorecard]: https://img.shields.io/ossf-scorecard/github.com/CLDMV/stubborn-tcp?style=for-the-badge&label=OpenSSF%20Scorecard
[ossf_scorecard_url]: https://scorecard.dev/viewer/?uri=github.com/CLDMV/stubborn-tcp
[npms.io score]: https://img.shields.io/npms-io/final-score/%40cldmv%2Fstubborn-tcp?style=for-the-badge&logo=npms&logoColor=white&labelColor=0B5D57
[npms_url]: https://npms.io/search?q=%40cldmv%2Fstubborn-tcp
[npm downloads]: https://img.shields.io/npm/dm/%40cldmv%2Fstubborn-tcp.svg?style=for-the-badge&logo=npm&logoColor=white&labelColor=CB3837
[npm_downloads_url]: https://www.npmjs.com/package/@cldmv/stubborn-tcp
[github downloads]: https://img.shields.io/github/downloads/CLDMV/stubborn-tcp/total?style=for-the-badge&logo=github&logoColor=white&labelColor=181717
[github_downloads_url]: https://github.com/CLDMV/stubborn-tcp/releases
[npm unpacked size]: https://img.shields.io/npm/unpacked-size/%40cldmv%2Fstubborn-tcp.svg?style=for-the-badge&logo=npm&logoColor=white&labelColor=CB3837
[npm_size_url]: https://www.npmjs.com/package/@cldmv/stubborn-tcp
[repo size]: https://img.shields.io/github/repo-size/CLDMV/stubborn-tcp?style=for-the-badge&logo=github&logoColor=white&labelColor=181717
[repo_size_url]: https://github.com/CLDMV/stubborn-tcp
[github license]: https://img.shields.io/github/license/CLDMV/stubborn-tcp.svg?style=for-the-badge&logo=github&logoColor=white&labelColor=181717
[github_license_url]: https://github.com/CLDMV/stubborn-tcp/blob/HEAD/LICENSE
[npm license]: https://img.shields.io/npm/l/%40cldmv%2Fstubborn-tcp.svg?style=for-the-badge&logo=npm&logoColor=white&labelColor=CB3837
[npm_license_url]: https://www.npmjs.com/package/@cldmv/stubborn-tcp
[coverage]: https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2FCLDMV%2Fstubborn-tcp%2Fbadges%2Fcoverage.json&style=for-the-badge&logo=vitest&logoColor=white
[coverage_url]: https://github.com/CLDMV/stubborn-tcp/blob/badges/coverage.json
[contributors]: https://img.shields.io/github/contributors/CLDMV/stubborn-tcp.svg?style=for-the-badge&logo=github&logoColor=white&labelColor=181717
[contributors_url]: https://github.com/CLDMV/stubborn-tcp/graphs/contributors
[sponsor shinrai]: https://img.shields.io/github/sponsors/shinrai?style=for-the-badge&logo=githubsponsors&logoColor=white&labelColor=EA4AAA&label=Sponsor
[sponsor_url]: https://github.com/sponsors/shinrai
