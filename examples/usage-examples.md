# StubbornTCP Usage Examples

This document shows how to use `@cldmv/stubborn-tcp` in both ES Modules and CommonJS environments.

## ES Modules (Recommended)

### Basic Import and Usage

```javascript
// Import the module (works in Node.js with type: "module" or .mjs files)
import StubbornTCP from "@cldmv/stubborn-tcp";

// Create a client with modern options
const client = new StubbornTCP({
	host: "localhost",
	port: 8080,
	debug: true,
	autoReconnect: true,
	keepAlive: true,
	noDelay: true
});

// Use event-driven approach
client.on("connect", () => {
	console.log("Connected to server!");
	client.write("Hello from ESM!");
});

client.on("data", (data) => {
	console.log("Received:", data.toString());
});

client.on("disconnect", () => {
	console.log("Disconnected, will attempt to reconnect...");
});

// Open connection
client.open();
```

### Named Import

```javascript
import { StubbornTCP } from "@cldmv/stubborn-tcp";

const client = new StubbornTCP({
	host: "api.example.com",
	port: 443,
	tls: true,
	tlsOptions: {
		rejectUnauthorized: true
	}
});
```

## CommonJS

### Basic Usage

```javascript
// Standard require (works in Node.js without type: "module")
const StubbornTCP = require("@cldmv/stubborn-tcp");

// Create a client - same API as ESM
const client = new StubbornTCP({
	host: "localhost",
	port: 8080,
	debug: true,
	rxFunc: (data, socket) => {
		console.log("Received via callback:", data.toString());
	},
	onConnect: (handle, socket) => {
		console.log("Connected via callback!");
		socket.write("Hello from CommonJS!");
	}
});

// Can also use events in CommonJS
client.on("disconnect", () => {
	console.log("Disconnected!");
});

client.open();
```

### Destructured Import

```javascript
const { StubbornTCP } = require("@cldmv/stubborn-tcp");

const client = new StubbornTCP({
	host: "localhost",
	port: 9000
});
```

### Default Export

```javascript
const StubbornTCP = require("@cldmv/stubborn-tcp").default;

const client = new StubbornTCP({
	host: "localhost",
	port: 9000
});
```

## Advanced Configuration Examples

### TLS/SSL Connection

```javascript
// Works in both ESM and CommonJS
const client = new StubbornTCP({
	host: "secure.example.com",
	port: 443,
	tls: true,
	tlsOptions: {
		rejectUnauthorized: true,
		servername: "secure.example.com",
		cert: fs.readFileSync("client-cert.pem"),
		key: fs.readFileSync("client-key.pem"),
		ca: fs.readFileSync("ca-cert.pem")
	},
	keepAlive: true,
	connectionTimeout: 10000
});

client.on("secureConnect", () => {
	console.log("Secure connection established");
	const cert = client.getPeerCertificate();
	console.log("Server certificate:", cert.subject);
});
```

### Reconnection with Exponential Backoff

```javascript
const client = new StubbornTCP({
	host: "unreliable-server.com",
	port: 8080,
	autoReconnect: true,
	reconnectDelay: 1000, // Start with 1 second
	maxReconnectDelay: 30000, // Cap at 30 seconds
	reconnectBackoffFactor: 2.0, // Double each time
	maxReconnectAttempts: 10 // Give up after 10 attempts
});

client.on("maxReconnectAttemptsReached", (attempts) => {
	console.log(`Gave up after ${attempts} reconnection attempts`);
});
```

### Heartbeat with Multiple Functions

```javascript
const client = new StubbornTCP({
	host: "localhost",
	port: 8080,
	heartbeatEnabled: true,
	heartbeatInterval: 30000,
	heartbeatFunc: [(client) => client.write("PING\n"), (client) => client.write("STATUS\n"), (client) => console.log("💓 Heartbeat sent")]
});

client.on("heartbeat", () => {
	console.log("Heartbeat cycle completed");
});
```

### Multiple Clients

```javascript
// Create multiple clients for load balancing or redundancy
const servers = ["server1.com", "server2.com", "server3.com"];
const clients = servers.map(
	(host) =>
		new StubbornTCP({
			host,
			port: 8080,
			debug: false,
			autoReconnect: true
		})
);

clients.forEach((client, index) => {
	client.on("connect", () => {
		console.log(`Client ${index} connected to ${servers[index]}`);
	});

	client.open();
});
```

## Factory Pattern (Without 'new')

Both ESM and CommonJS support calling without `new`:

```javascript
// ESM
import StubbornTCP from "@cldmv/stubborn-tcp";
const client = StubbornTCP({ host: "localhost", port: 8080 });

// CommonJS
const StubbornTCP = require("@cldmv/stubborn-tcp");
const client = StubbornTCP({ host: "localhost", port: 8080 });
```

## Legacy Callback Support

For backward compatibility with older code:

```javascript
const client = new StubbornTCP({
	rxFunc: onDataReceived,
	onConnect: onConnected,
	onDisconnect: onDisconnected,
	onError: onError,
	onTimeout: onTimeout
});

// Or set them after creation
client.OnConnectFunc = onConnected;
client.OnDisconnectFunc = onDisconnected;
```

## Error Handling

```javascript
const client = new StubbornTCP({
	host: "localhost",
	port: 8080,
	onError: (handle, socket, error) => {
		console.log("Callback error:", error.message);
	}
});

// Also handle via events
client.on("error", (error) => {
	console.log("Event error:", error.message);
});

client.on("timeout", () => {
	console.log("Connection timed out");
});
```

## Note on Module Loading

The CommonJS wrapper uses `createRequire` to synchronously load the ES module, ensuring compatibility with all Node.js environments while maintaining the performance and features of the modern ES module implementation.
