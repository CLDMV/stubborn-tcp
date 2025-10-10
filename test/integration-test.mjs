/**
 *	@Project: @cldmv/stubborn-tcp
 *	@Filename: /test/integration-test.mjs
 *	@Date: 2025-10-10 13:47:00 -07:00 (1760129220)
 *	@Author: Nate Hyson <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Hyson <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2025-10-10 13:47:00 -07:00 (1760129220)
 *	-----
 *	@Copyright: Copyright (c) 2013-2025 Catalyzed Motivation Inc. All rights reserved.
 */

import net from "net";
import tls from "tls";
import fs from "fs";
import path from "path";
import { setTimeout as delay } from "timers/promises";
import StubbornTCP from "../index.mjs";

/**
 * Test Results Tracker
 */
class TestRunner {
	constructor() {
		this.tests = [];
		this.passed = 0;
		this.failed = 0;
	}

	/**
	 * Run a test with timeout support
	 * @param {string} name - Test name
	 * @param {function} testFn - Test function (can be async)
	 * @param {number} timeout - Timeout in milliseconds
	 */
	async test(name, testFn, timeout = 10000) {
		console.log(`\n🧪 Running: ${name}`);
		console.log("-".repeat(50));

		try {
			const timeoutPromise = new Promise((_, reject) => {
				setTimeout(() => reject(new Error(`Test timeout after ${timeout}ms`)), timeout);
			});

			await Promise.race([testFn(), timeoutPromise]);
			console.log(`✅ PASSED: ${name}`);
			this.passed++;
			this.tests.push({ name, status: "PASSED" });
		} catch (error) {
			console.log(`❌ FAILED: ${name}`);
			console.log(`   Error: ${error.message}`);
			if (error.stack) {
				console.log(`   Stack: ${error.stack.split("\n").slice(0, 3).join("\n")}`);
			}
			this.failed++;
			this.tests.push({ name, status: "FAILED", error: error.message });
		}
	}

	/**
	 * Print final test results
	 */
	printResults() {
		console.log("\n" + "=".repeat(60));
		console.log("📊 TEST RESULTS SUMMARY");
		console.log("=".repeat(60));
		console.log(`✅ Passed: ${this.passed}`);
		console.log(`❌ Failed: ${this.failed}`);
		console.log(`📈 Total:  ${this.tests.length}`);
		console.log(`🎯 Success Rate: ${((this.passed / this.tests.length) * 100).toFixed(1)}%`);

		if (this.failed > 0) {
			console.log("\n❌ Failed Tests:");
			this.tests.filter((t) => t.status === "FAILED").forEach((t) => console.log(`   - ${t.name}: ${t.error}`));
		}

		process.exit(this.failed > 0 ? 1 : 0);
	}
}

/**
 * Test TCP Echo Server
 */
class TestServer {
	constructor(port = 0, tls = false) {
		this.port = port;
		this.tls = tls;
		this.server = null;
		this.connections = [];
		this.messages = [];
	}

	/**
	 * Start the test server
	 */
	async start() {
		return new Promise((resolve, reject) => {
			if (this.tls) {
				// Create self-signed cert for testing
				const tlsOptions = {
					key: this.generateSelfSignedKey(),
					cert: this.generateSelfSignedCert()
				};
				this.server = tls.createServer(tlsOptions, this.handleConnection.bind(this));
			} else {
				this.server = net.createServer(this.handleConnection.bind(this));
			}

			this.server.listen(this.port, () => {
				this.port = this.server.address().port;
				console.log(`🖥️  Test server started on port ${this.port} (${this.tls ? "TLS" : "TCP"})`);
				resolve(this.port);
			});

			this.server.on("error", reject);
		});
	}

	/**
	 * Handle incoming connections
	 */
	handleConnection(socket) {
		console.log(`📞 Client connected from ${socket.remoteAddress}:${socket.remotePort}`);
		this.connections.push(socket);

		socket.on("data", (data) => {
			const message = data.toString();
			console.log(`📨 Server received: ${message}`);
			this.messages.push(message);

			// Echo back with prefix
			const response = `ECHO: ${message}`;
			socket.write(response);
			console.log(`📤 Server sent: ${response}`);
		});

		socket.on("close", () => {
			console.log(`📞 Client disconnected`);
			const index = this.connections.indexOf(socket);
			if (index > -1) this.connections.splice(index, 1);
		});

		socket.on("error", (err) => {
			console.log(`🚨 Server socket error: ${err.message}`);
		});
	}

	/**
	 * Stop the server
	 */
	async stop() {
		return new Promise((resolve) => {
			if (this.server) {
				// Close all connections
				this.connections.forEach((socket) => socket.destroy());
				this.connections = [];

				this.server.close(() => {
					console.log(`🛑 Test server stopped`);
					resolve();
				});
			} else {
				resolve();
			}
		});
	}

	/**
	 * Generate self-signed key for TLS testing
	 */
	generateSelfSignedKey() {
		// Minimal key for testing - in production use proper certificates
		return `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7VJTUt9Us8cKB
wQNkks5v4FpXZmCfwKgVLjkOY2gzaXKPxAaR5gGQIw0DYT5KKRKGlwRgKPg/uAzp
VlNMLVz7SJ3cX7OPfmFk1LjuEj7xrMOE8iBa+Q0Qa1xKBz7BpWMU5Ek7xJgBwFkn
2v7LLQMb6ScJpOiCWdp5yt1bvyLKJuF5w5LttePWBWLZP2khXcW7z8oqvDLF+z5g
f0oeZgV7oNkT8k1P0g7L9XEyJ4cONvLnZOOgKxJ6tLq8s7cR3KN8h8eA1X5OjWYa
5+YRn9O3LwK6p6y4d5oJVQpE0Xst2/Vz8YE2h1vJ8+UoL8qvU2LPNcPGhO9kv6D8
e6CL7w5JAgMBAAECggEAI5xo9ZL7Jj1N3q8oKzO7QOLfuFoL3HzpYuEj9k9wL+vG
-----END PRIVATE KEY-----`;
	}

	/**
	 * Generate self-signed certificate for TLS testing
	 */
	generateSelfSignedCert() {
		return `-----BEGIN CERTIFICATE-----
MIICljCCAX4CCQDJn2a8OUX0/TANBgkqhkiG9w0BAQsFADANMQswCQYDVQQGEwJV
UzAeFw0yNTEwMTAyMDQ3MDBaFw0yNjEwMTAyMDQ3MDBaMA0xCzAJBgNVBAYTAlVT
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu1SU1L7VLPHCgcEDZJLO
b+BaV2Zgn8CoFS45DmNoM2lyj8QGkeYBkCMNA2E+SikShpcEYCj4P7gM6VZTTDVc
+0id3F+zj35hZNS47hI+8azDhPIgWvkNEGtcSgc+waVjFORJO8SYAcBZJ9r+yy0
DG+knCaToglnaecrdW78iyibhecOS7bXj1gVi2T9pIV3Fu8/KKrwyxfs+YH9KHmYF
e6DZE/JNT9IOy/VxMieHDjby52TjoCsSezS6vLO3EdyjfIfHgNV+To1mGufmEZ/T
ty8CuqesuHeaCVUKRNF7Ldv1c/GBNodbyfPlKC/Kr1NizzXDxoTvZL+g/Hugee8O
SQIDAQABo1MwUTAdBgNVHQ4EFgQUqPpOxd9aOr+UdgbL8eTgVILXQhwwHwYDVR0j
BBgwFoAUqPpOxd9aOr+UdgbL8eTgVILXQhwwDwYDVR0TAQH/BAUwAwEB/zANBgkqhkiG
9w0BAQsFAAOCAQEAQzpY9L8I5F3jNOdJKGVs5iO8uVcJn5tFcP1mKPMgLWP8zOEB
-----END CERTIFICATE-----`;
	}
}

const runner = new TestRunner();

console.log("🚀 StubbornTCP Integration Tests");
console.log("=".repeat(60));

// Test 1: Basic TCP Connection and Data Exchange
await runner.test("Basic TCP Connection and Data Exchange", async () => {
	const server = new TestServer();
	const port = await server.start();

	let connected = false;
	let dataReceived = null;
	let disconnected = false;

	const client = new StubbornTCP({
		debug: true,
		autoReconnect: false
	});

	// Set up event handlers
	client.on("connect", () => {
		connected = true;
		console.log("📞 Client connected to server");
	});

	client.on("data", (data) => {
		dataReceived = data.toString();
		console.log(`📨 Client received: ${dataReceived}`);
	});

	client.on("disconnect", () => {
		disconnected = true;
		console.log("📞 Client disconnected");
	});

	// Connect and send data
	client.open("localhost", port);

	// Wait for connection
	await delay(100);
	if (!connected) throw new Error("Failed to connect to server");

	// Send test data
	const testMessage = "Hello, Integration Test!";
	client.write(testMessage);

	// Wait for echo response
	await delay(200);
	if (!dataReceived) throw new Error("No data received from server");
	if (!dataReceived.includes(testMessage)) throw new Error(`Expected echo of "${testMessage}", got "${dataReceived}"`);

	// Clean up
	client.close();
	await server.stop();

	console.log("✅ Basic TCP connection, data exchange, and cleanup successful");
});

// Test 2: Auto-Reconnection with Exponential Backoff
await runner.test("Auto-Reconnection with Exponential Backoff", async () => {
	const server = new TestServer();
	const port = await server.start();

	let connectionCount = 0;
	let reconnectAttempts = 0;
	let errorCount = 0;
	let maxAttemptsReached = false;

	const client = new StubbornTCP({
		debug: true,
		autoReconnect: true,
		reconnectDelay: 500,
		maxReconnectDelay: 2000,
		reconnectBackoffFactor: 2.0,
		maxReconnectAttempts: 3
	});

	client.on("connect", () => {
		connectionCount++;
		console.log(`📞 Connection #${connectionCount} established`);
	});

	client.on("disconnect", () => {
		reconnectAttempts++;
		console.log(`💔 Disconnection #${reconnectAttempts} detected`);
	});

	client.on("error", (error) => {
		errorCount++;
		console.log(`🚨 Connection error #${errorCount}: ${error.message}`);
	});

	client.on("maxReconnectAttemptsReached", (attempts) => {
		maxAttemptsReached = true;
		console.log(`🛑 Max reconnect attempts reached: ${attempts}`);
	});

	// Initial connection
	client.open("localhost", port);
	await delay(200);
	if (connectionCount !== 1) throw new Error("Initial connection failed");

	// Force disconnect to trigger reconnection
	console.log("🔌 Forcing server disconnect to test reconnection...");
	await server.stop();

	// Wait for reconnection attempts and errors
	await delay(6000);

	// Should have attempted reconnection but failed (server is down)
	if (reconnectAttempts === 0) throw new Error("No reconnection attempts detected");
	if (errorCount === 0) throw new Error("Expected connection errors during reconnection attempts");
	if (!maxAttemptsReached) throw new Error("Max reconnect attempts should have been reached");

	console.log(`✅ Reconnection logic tested: ${reconnectAttempts} disconnects, ${errorCount} errors, max attempts reached`);

	client.close();
});

// Test 3: Heartbeat Functionality
await runner.test("Heartbeat Functionality", async () => {
	const server = new TestServer();
	const port = await server.start();

	let heartbeatCount = 0;
	let heartbeatMessages = [];

	const client = new StubbornTCP({
		debug: true,
		autoReconnect: false
	});

	client.on("connect", () => {
		console.log("📞 Connected, enabling heartbeat...");
		// Enable heartbeat with multiple functions
		client.enableHeartbeat({
			interval: 300, // Fast for testing
			functions: [
				(client) => {
					const msg = `HEARTBEAT_1_${Date.now()}`;
					heartbeatMessages.push(msg);
					client.write(msg);
				},
				(client) => {
					const msg = `HEARTBEAT_2_${Date.now()}`;
					heartbeatMessages.push(msg);
					client.write(msg);
				}
			],
			resetOnActivity: true
		});
	});

	client.on("heartbeat", () => {
		heartbeatCount++;
		console.log(`💓 Heartbeat #${heartbeatCount} sent`);
	});

	// Connect and wait for heartbeats
	client.open("localhost", port);
	await delay(1000); // Wait for several heartbeat cycles

	if (heartbeatCount < 2) throw new Error(`Expected at least 2 heartbeats, got ${heartbeatCount}`);
	if (heartbeatMessages.length < 2) throw new Error(`Expected at least 2 heartbeat messages, got ${heartbeatMessages.length}`);

	// Verify server received heartbeat messages
	await delay(100);
	const receivedHeartbeats = server.messages.filter((msg) => msg.includes("HEARTBEAT"));
	if (receivedHeartbeats.length < 2) throw new Error(`Server should have received heartbeat messages`);

	console.log(`✅ Heartbeat system working: ${heartbeatCount} heartbeats, ${heartbeatMessages.length} messages`);

	client.close();
	await server.stop();
});

// Test 4: Socket Configuration Options
await runner.test("Socket Configuration Options", async () => {
	const server = new TestServer();
	const port = await server.start();

	const client = new StubbornTCP({
		debug: true,
		keepAlive: true,
		keepAliveInitialDelay: 1000,
		noDelay: true,
		connectionTimeout: 5000,
		autoReconnect: false
	});

	let connected = false;
	client.on("connect", () => {
		connected = true;
		console.log("📞 Connected with socket options applied");

		// Test runtime configuration changes
		client.setKeepAlive(false);
		client.setNoDelay(false);
		client.setTimeout(10000);
		console.log("🔧 Socket options updated at runtime");
	});

	client.open("localhost", port);
	await delay(200);

	if (!connected) throw new Error("Connection with socket options failed");

	// Verify connection properties
	if (typeof client.localAddress !== "string") throw new Error("Local address not available");
	if (typeof client.localPort !== "number") throw new Error("Local port not available");
	if (typeof client.remoteAddress !== "string") throw new Error("Remote address not available");
	if (typeof client.remotePort !== "number") throw new Error("Remote port not available");

	console.log(`✅ Socket configured: ${client.localAddress}:${client.localPort} -> ${client.remoteAddress}:${client.remotePort}`);

	client.close();
	await server.stop();
});

// Test 5: Connection Timeout
await runner.test("Connection Timeout", async () => {
	let timeoutOccurred = false;
	let errorOccurred = false;

	const client = new StubbornTCP({
		debug: true,
		connectionTimeout: 1000, // 1 second timeout
		autoReconnect: false
	});

	client.on("timeout", () => {
		timeoutOccurred = true;
		console.log("⏰ Connection timeout detected");
	});

	client.on("error", (error) => {
		errorOccurred = true;
		console.log(`🚨 Connection error (expected): ${error.message}`);
	});

	// Try to connect to a non-responsive address (should timeout or error)
	client.open("192.0.2.1", 9999); // RFC5737 test address

	await delay(3000); // Wait longer than timeout

	// Either timeout or error should occur (both are valid outcomes)
	if (!timeoutOccurred && !errorOccurred) {
		throw new Error("Neither timeout nor error was triggered");
	}

	console.log(`✅ Connection handling working (timeout: ${timeoutOccurred}, error: ${errorOccurred})`);

	client.close();
});

// Test 6: Error Handling
await runner.test("Error Handling", async () => {
	let errorCount = 0;
	let eventErrorCount = 0;
	let lastError = null;

	const client = new StubbornTCP({
		debug: true,
		autoReconnect: false,
		onError: (handle, socket, error) => {
			errorCount++;
			lastError = error;
			console.log(`🚨 Error callback triggered: ${error.message}`);
		}
	});

	client.on("error", (error) => {
		eventErrorCount++;
		console.log(`🚨 Error event emitted: ${error.message}`);
	});

	// Try to connect to invalid address to trigger error
	client.open("invalid.host.name.that.does.not.exist", 80);

	await delay(3000);

	if (errorCount === 0) throw new Error("No errors were captured via callback");
	if (eventErrorCount === 0) throw new Error("No errors were captured via events");
	if (!lastError) throw new Error("Error callback was not called");

	console.log(`✅ Error handling working: ${errorCount} callback errors, ${eventErrorCount} event errors`);

	client.close();
});

// Test 7: Multiple Clients Simultaneously
await runner.test("Multiple Clients Simultaneously", async () => {
	const server = new TestServer();
	const port = await server.start();

	const clients = [];
	const connections = [];
	const dataReceived = [];

	// Create 3 clients
	for (let i = 0; i < 3; i++) {
		const client = new StubbornTCP({
			debug: false, // Reduce noise
			autoReconnect: false
		});

		client.on("connect", () => {
			connections.push(i);
			console.log(`📞 Client ${i} connected`);
		});

		client.on("data", (data) => {
			dataReceived.push({ client: i, data: data.toString() });
			console.log(`📨 Client ${i} received: ${data.toString()}`);
		});

		clients.push(client);
		client.open("localhost", port);
	}

	// Wait for all connections
	await delay(300);
	if (connections.length !== 3) throw new Error(`Expected 3 connections, got ${connections.length}`);

	// Send data from each client
	for (let i = 0; i < 3; i++) {
		clients[i].write(`Message from client ${i}`);
	}

	// Wait for all responses
	await delay(300);
	if (dataReceived.length !== 3) throw new Error(`Expected 3 responses, got ${dataReceived.length}`);

	// Verify each client got its echo
	for (let i = 0; i < 3; i++) {
		const clientData = dataReceived.find((d) => d.client === i);
		if (!clientData) throw new Error(`No data received by client ${i}`);
		if (!clientData.data.includes(`Message from client ${i}`)) {
			throw new Error(`Client ${i} received wrong data: ${clientData.data}`);
		}
	}

	console.log("✅ All 3 clients connected and exchanged data successfully");

	// Clean up
	clients.forEach((client) => client.close());
	await server.stop();
});

// Test 8: Large Data Transfer
await runner.test("Large Data Transfer", async () => {
	const server = new TestServer();
	const port = await server.start();

	let dataReceived = "";
	let connected = false;

	const client = new StubbornTCP({
		debug: true,
		autoReconnect: false
	});

	client.on("connect", () => {
		connected = true;
	});

	client.on("data", (data) => {
		dataReceived += data.toString();
	});

	client.open("localhost", port);
	await delay(100);

	if (!connected) throw new Error("Failed to connect");

	// Send 10KB of data
	const largeData = "X".repeat(10000);
	client.write(largeData);

	// Wait for echo response
	await delay(500);

	if (dataReceived.length === 0) throw new Error("No data received");
	if (!dataReceived.includes(largeData)) throw new Error("Large data not properly echoed");

	console.log(`✅ Successfully transferred ${largeData.length} bytes of data`);

	client.close();
	await server.stop();
});

// Print final results
runner.printResults();
