/**
 * Test script to verify the timeout fix
 */
import StubbornTCP from "../stubborn-tcp.mjs";

console.log("Testing timeout fix...\n");

// Test 1: Connection with timeout disabled (0)
console.log("Test 1: Creating client with timeout 0 (disabled)");
const client1 = new StubbornTCP({
	host: "httpbin.org",
	port: 80,
	connectionTimeout: 0,
	debug: true,
	autoReconnect: false
});

// Listen for debug events instead of console.log
client1.on("debug", (message) => {
	console.log("DEBUG:", message);
});

client1.on("connect", () => {
	console.log("✓ Test 1 PASSED: Connected successfully with timeout=0");
	client1.close();

	// Test 2: Change timeout to 0 on existing connection
	console.log("\nTest 2: Creating client with normal timeout, then setting to 0");
	const client2 = new StubbornTCP({
		host: "httpbin.org",
		port: 80,
		connectionTimeout: 5000,
		debug: true,
		autoReconnect: false
	});

	client2.on("debug", (message) => {
		console.log("DEBUG:", message);
	});

	client2.on("connect", () => {
		console.log("Connected with normal timeout, now setting to 0...");
		client2.setTimeout(0);

		setTimeout(() => {
			console.log("✓ Test 2 PASSED: Connection remained stable after setting timeout to 0");
			client2.close();

			// Test 3: Negative timeout
			console.log("\nTest 3: Creating client with negative timeout");
			const client3 = new StubbornTCP({
				host: "httpbin.org",
				port: 80,
				connectionTimeout: -1,
				debug: true,
				autoReconnect: false
			});

			client3.on("debug", (message) => {
				console.log("DEBUG:", message);
			});

			client3.on("connect", () => {
				console.log("✓ Test 3 PASSED: Connected successfully with timeout=-1");
				client3.close();
				console.log("\n✓ All timeout tests completed successfully!");
			});

			client3.on("error", (err) => {
				console.log("✗ Test 3 FAILED:", err.message);
			});
		}, 2000); // Wait 2 seconds to ensure connection stays stable
	});

	client2.on("error", (err) => {
		console.log("✗ Test 2 FAILED:", err.message);
	});
});

client1.on("error", (err) => {
	console.log("✗ Test 1 FAILED:", err.message);
});

// Timeout the entire test after 30 seconds
setTimeout(() => {
	console.log("Test timeout - exiting");
	process.exit(1);
}, 30000);
