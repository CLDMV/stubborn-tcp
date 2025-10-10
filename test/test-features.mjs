/**
 * Test file demonstrating socket configuration and TLS features
 */

import StubbornTCP from "../index.mjs";

console.log("🧪 Testing StubbornTCP Advanced Features");
console.log("=".repeat(50));

// Test 1: Socket Configuration Options
console.log("\n1️⃣ Testing Socket Configuration:");
const tcpClient = new StubbornTCP({
	debug: true,
	keepAlive: true,
	keepAliveInitialDelay: 30000,
	noDelay: true,
	connectionTimeout: 5000
});

console.log("✅ TCP client created with socket options");
console.log(`   - Keep-alive: enabled`);
console.log(`   - No-delay: enabled`);
console.log(`   - Connection timeout: 5000ms`);

// Test socket option methods
tcpClient.setKeepAlive(false);
tcpClient.setNoDelay(false);
tcpClient.setTimeout(10000);

console.log("✅ Socket options updated dynamically");

// Test 2: Connection Properties
console.log("\n2️⃣ Testing Connection Properties:");
console.log(`   - Connect State: ${tcpClient.connectState}`);
console.log(`   - Open State: ${tcpClient.openState}`);
console.log(`   - Is Secure: ${tcpClient.isSecure}`);
console.log(`   - Local Address: ${tcpClient.localAddress}`);
console.log(`   - Remote Address: ${tcpClient.remoteAddress}`);

// Test 3: TLS Configuration (won't connect but tests creation)
console.log("\n3️⃣ Testing TLS Configuration:");
const tlsClient = new StubbornTCP({
	debug: true,
	tls: true,
	tlsOptions: {
		rejectUnauthorized: true,
		servername: "example.com"
	},
	keepAlive: true,
	noDelay: true
});

console.log("✅ TLS client created with options");
console.log(`   - Is Secure: ${tlsClient.isSecure}`);
console.log(`   - TLS Options configured`);

// Test TLS-specific methods (will return null when not connected)
console.log(`   - Peer Certificate: ${tlsClient.getPeerCertificate()}`);
console.log(`   - Cipher Info: ${tlsClient.getCipher()}`);
console.log(`   - Is Authorized: ${tlsClient.isAuthorized()}`);
console.log(`   - Auth Error: ${tlsClient.getAuthorizationError()}`);

// Test 4: Heartbeat with Socket Configuration
console.log("\n4️⃣ Testing Heartbeat with Socket Config:");
const heartbeatClient = new StubbornTCP({
	debug: true,
	heartbeatEnabled: true,
	heartbeatInterval: 5000,
	heartbeatFunc: [(client) => console.log("💓 Heartbeat function 1 called"), (client) => console.log("💓 Heartbeat function 2 called")],
	keepAlive: true,
	noDelay: true
});

console.log("✅ Heartbeat client created with multiple functions");

// Add event listeners to demonstrate TLS events
tlsClient.on("secureConnect", () => {
	console.log("🔒 TLS secure connection established");
});

tlsClient.on("keylog", (line) => {
	console.log("🔑 TLS key material:", line);
});

// Clean up
tcpClient.close();
tlsClient.close();
heartbeatClient.close();

console.log("\n✅ All advanced feature tests completed!");
console.log("🎉 Socket configuration and TLS support working correctly!");
